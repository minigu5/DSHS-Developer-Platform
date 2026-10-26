'use server'

// 도메인 마련하기 서버 액션. (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.
// 순서는 항상: getUser() → 학교 계정 확인 → 입력 검사 → 서비스 키로 subdomain_* 함수(안에서 소유자·관리자 재확인)
// → Cloudflare. DB 함수가 마지막 방어선이고, 여기의 검사는 빠른 실패·친절한 문구를 위한 것.
// 흐름(2026-10-26 확인 먼저): ① 예약 + 경고 페이지 자리표시 → ② 학생 사이트 원래 주소에서 토큰 확인 → ③ 연결.
// 설계: docs/superpowers/specs/2026-10-25-subdomain-lending-design.md, docs/superpowers/specs/2026-10-26-domain-verify-first-design.md

import { revalidatePath } from 'next/cache'

import { isAllowedEmail, isDeveloper } from '@/lib/constants'
import { assertSafePublicUrl } from '@/lib/ssrf-guard'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SubdomainStatus } from '@/lib/types'

import { activateRedirect, connectionLive, createPlaceholder } from './activate'
import { getDnsClient } from './cloudflare'
import { removeCloudflare } from './cleanup'
import { buildRecords, runConnect } from './connect'
import { createSiteFetcher } from './fetch-site'
import { HOST_PRESETS, isRedirectHost, siteAddressFor, siteHostFor, targetBoundToSite, validateTarget, validateTxt, type HostKey, type TxtInput } from './hosts'
import { normalizeName, validateName } from './name'
import { getRedirectClient, redirectConfigured } from './redirects'
import { checkSite, type CheckResult } from './verify'

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

const UNKNOWN = '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'

// subdomain_* 함수가 P0001 로 던지는 코드 → 문구
const RPC_ERRORS: Record<string, string> = {
  not_owner: '내 프로젝트의 주소만 다룰 수 있어요.',
  not_website: '방문 주소가 있는 웹사이트 프로젝트만 주소를 받을 수 있어요.',
  name_invalid: '이름은 3~30자의 영어 소문자·숫자·하이픈(-)으로 적어요. 하이픈으로 시작하거나 끝날 수 없어요.',
  name_reserved: '이 이름은 쓸 수 없어요. 사이트에서 쓰려고 남겨 둔 이름이거나 xn--로 시작하는 이름이에요. 다른 이름을 골라요.',
  name_taken: '이미 누가 쓰고 있는 이름이에요.',
  project_has_subdomain: '이 프로젝트에는 이미 주소가 있어요.',
  limit: '주소는 한 사람당 3개까지 받을 수 있어요.',
  not_live: '이미 반납되었거나 회수된 주소예요.',
  target_invalid: 'CNAME 값이 고른 호스트의 주소가 아니에요. 호스트가 보여 준 값을 그대로 붙여 넣어요.',
  redirect_target_invalid: '보낼 곳 주소가 고른 호스트의 기본 주소가 아니에요. 예: 이름.web.app',
  txt_invalid: 'TXT 확인값이 이 주소의 것이 아니에요. 호스트가 보여 준 값을 그대로 붙여 넣어요.',
  txt_missing: '이 호스트는 TXT 확인값이 있어야 연결돼요. 호스트가 보여 준 값을 붙여 넣어요.',
  not_active: '연결이 확인된 주소만 방문 주소로 바꿀 수 있어요.',
  not_admin: '관리자만 할 수 있어요.',
  reason_invalid: '회수 이유를 1~200자로 적어 주세요.',
  not_revoked: '회수된 주소가 아니에요.',
  not_found: '주소를 찾지 못했어요.',
  not_redirect: '바로가기 호스트의 주소가 아니에요.',
  records_exist: '이미 바로가기가 만들어졌어요.',
  not_verified: '먼저 ②에서 내 사이트를 확인해요.',
  host_mismatch: '②에서 확인한 사이트의 호스트로만 연결할 수 있어요.',
  target_mismatch: 'CNAME 값이 ②에서 확인한 사이트 주소와 달라요.',
  site_invalid: '호스트의 기본 주소(예: 이름.vercel.app)를 넣어요.',
  site_changed: '확인하는 사이에 사이트 주소가 바뀌었어요. 다시 확인해요.',
}

const REDIRECT_FAILED = '바로가기를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.'
const REDIRECT_NOT_READY = '바로가기는 아직 준비 중이에요. 잠시 뒤 다시 시도해 주세요.'

const NAME_REASONS: Record<'length' | 'chars' | 'reserved' | 'idn', string> = {
  length: '이름은 3~30자로 적어요.',
  chars: '영어 소문자·숫자·하이픈(-)만 쓸 수 있고, 하이픈으로 시작하거나 끝날 수 없어요.',
  reserved: '사이트에서 쓰려고 남겨 둔 이름이에요.',
  idn: '한글 같은 영어가 아닌 이름(xn--로 시작)은 아직 쓸 수 없어요. 영어 소문자·숫자·하이픈(-)으로 된 이름을 골라요.',
}

function rpcError(tag: string, error: { message: string }): { ok: false; error: string } {
  const code = error.message.trim()
  if (!RPC_ERRORS[code]) console.error(`[domains] ${tag} 실패`, error)
  return { ok: false, error: RPC_ERRORS[code] ?? UNKNOWN }
}

async function currentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email || !isAllowedEmail(user.email)) return null
  return { id: user.id, email: user.email }
}

const LOGIN_REQUIRED = { ok: false as const, error: '학교 계정으로 로그인해야 해요.' }

// 서비스 키로 한 행을 읽는다 — 소유자 확인은 호출부가 한다
async function loadRow(id: string) {
  const { data } = await createAdminClient()
    .from('subdomains')
    .select('id, name, owner_id, project_id, status, host, target, verify_token, cf_record_ids, site_url, site_host, site_verified_at')
    .eq('id', id)
    .maybeSingle()
  return data
}

function done() {
  revalidatePath('/domains', 'layout')
}

export async function checkNameAvailable(raw: string): Promise<ActionResult<{ available: boolean; reason?: string }>> {
  if (!(await currentUser())) return LOGIN_REQUIRED
  const name = normalizeName(raw)
  const v = validateName(name)
  if (!v.ok) return { ok: true, data: { available: false, reason: NAME_REASONS[v.reason] } }

  const { count, error } = await createAdminClient()
    .from('subdomains')
    .select('id', { count: 'exact', head: true })
    .eq('name', name)
    .in('status', ['reserved', 'pending', 'active', 'broken', 'revoked'])
  if (error) return { ok: false, error: UNKNOWN }
  return count ? { ok: true, data: { available: false, reason: RPC_ERRORS.name_taken } } : { ok: true, data: { available: true } }
}

export async function reserveSubdomain(projectId: string, rawName: string): Promise<ActionResult<{ id: string }>> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const name = normalizeName(rawName)
  const v = validateName(name)
  if (!v.ok) return { ok: false, error: NAME_REASONS[v.reason] }

  // 비공개 프로젝트는 주소를 못 받는다. 내 프로젝트만 읽어서(남의 공개 범위는 알려 주지 않음), 아니면 아래 RPC 가 not_owner 로 거른다.
  const { data: project } = await createAdminClient()
    .from('projects')
    .select('visibility')
    .eq('id', projectId)
    .eq('author_id', user.id)
    .maybeSingle()
  if (project?.visibility === 'private') return { ok: false, error: '비공개 프로젝트는 도메인을 마련할 수 없어요.' }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('subdomain_reserve', { p_user: user.id, p_project: projectId, p_name: name })
  if (error) return rpcError('subdomain_reserve', error)

  // 확인 전에 들어오면 경고 페이지로 — 최선 노력. 못 만들면 주소가 DNS 부터 안 풀려 그래도 열리지 않는다
  if (redirectConfigured()) {
    try {
      await createPlaceholder(
        {
          dns: getDnsClient(),
          redirects: getRedirectClient,
          setRecords: async (ids) => {
            const { error: e } = await admin.rpc('subdomain_set_placeholder_records', { p_id: data, p_record_ids: ids })
            if (e) throw e
          },
        },
        { id: data, name },
      )
    } catch (e) {
      console.error('[domains] 자리표시 만들기 실패(예약은 그대로)', e)
    }
  }
  done()
  return { ok: true, data: { id: data } }
}

// ② 내 사이트 원래 주소 저장. 바뀌면 확인 기록이 지워진다(이미 연결된 DNS 는 그대로)
export async function setSiteAddress(id: string, raw: string): Promise<ActionResult<{ siteUrl: string; host: HostKey }>> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const site = siteAddressFor(raw)
  if (!site) return { ok: false, error: RPC_ERRORS.site_invalid }
  if (isRedirectHost(site.host) && !redirectConfigured()) return { ok: false, error: REDIRECT_NOT_READY }
  const { error } = await createAdminClient().rpc('subdomain_set_site', {
    p_user: user.id,
    p_id: id,
    p_site_url: site.url,
    p_site_host: site.host,
  })
  if (error) return rpcError('subdomain_set_site', error)
  done()
  return { ok: true, data: { siteUrl: site.url, host: site.host } }
}

export async function connectHost(id: string, host: HostKey, rawTarget: string, rawTxt: TxtInput[]): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  if (!Object.hasOwn(HOST_PRESETS, host)) return { ok: false, error: RPC_ERRORS.target_invalid }
  if (isRedirectHost(host) && !redirectConfigured()) return { ok: false, error: REDIRECT_NOT_READY }

  const row = await loadRow(id)
  if (!row || row.owner_id !== user.id) return { ok: false, error: RPC_ERRORS.not_owner }
  if (!['reserved', 'pending', 'active', 'broken'].includes(row.status)) return { ok: false, error: RPC_ERRORS.not_live }
  if (!row.site_verified_at) return { ok: false, error: RPC_ERRORS.not_verified }
  if (row.site_host !== host) return { ok: false, error: RPC_ERRORS.host_mismatch }

  // 대상이 곧 사이트인 호스트는 확인한 원래 주소의 호스트 이름으로 정한다(바로가기는 입력을 받지 않는다)
  const siteHostname = row.site_url ? new URL(row.site_url).hostname : null
  const target = validateTarget(host, isRedirectHost(host) ? (siteHostname ?? '') : rawTarget)
  if (target && targetBoundToSite(host) && target !== siteHostname) return { ok: false, error: RPC_ERRORS.target_mismatch }
  if (!target) return { ok: false, error: isRedirectHost(host) ? RPC_ERRORS.redirect_target_invalid : RPC_ERRORS.target_invalid }
  // 바로가기 호스트는 TXT 를 받지 않는다
  const filled = isRedirectHost(host) ? [] : rawTxt.filter((t) => t.name.trim() || t.value.trim())
  if (filled.length > 2) return { ok: false, error: RPC_ERRORS.txt_invalid }
  const txt: TxtInput[] = []
  for (const t of filled) {
    const ok = validateTxt(host, row.name, t)
    if (!ok) return { ok: false, error: RPC_ERRORS.txt_invalid }
    txt.push(ok)
  }
  if (HOST_PRESETS[host].txt?.required && txt.length === 0) return { ok: false, error: RPC_ERRORS.txt_missing }

  try {
    // 다시 연결하는 경우 옛 레코드부터 지운다(같은 이름의 CNAME 은 하나만 둘 수 있다). 바로가기였다면 목록 항목도
    if (row.cf_record_ids.length) await removeCloudflare(row.cf_record_ids)

    const admin = createAdminClient()
    // 바로가기: ②에서 이미 확인했으므로 바로 AAAA + 목록 항목을 만들고 subdomain_connect 로 기록한다
    if (isRedirectHost(host)) {
      await activateRedirect(
        {
          dns: getDnsClient(),
          redirects: getRedirectClient,
          setRecords: async (ids) => {
            const { error } = await admin.rpc('subdomain_connect', {
              p_user: user.id,
              p_id: id,
              p_host: host,
              p_target: target,
              p_txt: [],
              p_record_ids: ids,
            })
            if (error) throw error
          },
        },
        { id, name: row.name, target },
      )
      done()
      return { ok: true, data: null }
    }

    const dns = getDnsClient()
    await runConnect(
      {
        dns,
        rpcConnect: async (ids) => {
          const { error } = await admin.rpc('subdomain_connect', {
            p_user: user.id,
            p_id: id,
            p_host: host,
            p_target: target,
            p_txt: txt,
            p_record_ids: ids,
          })
          if (error) throw error
        },
      },
      buildRecords(row.name, target, txt),
      id,
    )
  } catch (e) {
    if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && RPC_ERRORS[e.message.trim()]) {
      return { ok: false, error: RPC_ERRORS[e.message.trim()] }
    }
    console.error('[domains] connectHost 실패', e)
    return { ok: false, error: isRedirectHost(host) ? REDIRECT_FAILED : 'DNS 레코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  }
  done()
  return { ok: true, data: null }
}

// result 가 unreachable 일 때만 detail(예: "status 404", "redirect to another host") — 왜 안 열리는지 화면에 보여 주려고.
// ② 확인 전(원래 주소가 있고 아직 확인 안 됨)이면 원래 주소를, 그 뒤 호스트에 연결했으면 실제로 열리는 곳을 확인한다.
export async function verifySubdomain(
  id: string,
): Promise<ActionResult<{ result: CheckResult['kind']; detail: string | null; status: SubdomainStatus; siteVerified: boolean }>> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const row = await loadRow(id)
  if (!row || row.owner_id !== user.id) return { ok: false, error: RPC_ERRORS.not_owner }

  const siteStep = !row.site_verified_at && row.site_url && row.site_host
  if (!siteStep && !row.host) return { ok: false, error: '먼저 ②에서 내 사이트 주소를 넣어요.' }

  // 확인할 곳 — 사설 IP 로 풀리면 요청하지 않는다
  const base = siteStep ? row.site_url! : `https://${siteHostFor({ name: row.name, host: row.host!, target: row.target })}/`
  const presetHost = siteStep ? row.site_host! : row.host!
  const safe = await assertSafePublicUrl(base)
  const result: CheckResult = safe.ok
    ? await checkSite(base, row.verify_token, presetHost, createSiteFetcher())
    : { kind: 'unreachable', detail: safe.reason }
  const detail = result.kind === 'unreachable' ? result.detail.slice(0, 120) : null

  if (siteStep) {
    if (result.kind === 'ok') {
      const { error } = await createAdminClient().rpc('subdomain_verify_site', { p_user: user.id, p_id: id, p_site_url: row.site_url! })
      if (error) return rpcError('subdomain_verify_site', error)
      done()
    }
    return { ok: true, data: { result: result.kind, detail, status: row.status, siteVerified: result.kind === 'ok' } }
  }

  // 바로가기 행인데 목록 항목이 없으면 토큰이 보여도 실제로는 안 넘어간다 → 연결됨으로 치지 않는다
  const { data, error } = await createAdminClient().rpc('subdomain_record_check', {
    p_id: id,
    p_ok: result.kind === 'ok' && connectionLive(row),
    p_now: new Date().toISOString(),
  })
  if (error) return rpcError('subdomain_record_check', error)
  // 화면이 자동으로 반복 확인하므로, 상태가 그대로면 페이지를 다시 그리게 하지 않는다
  if (data !== row.status) done()
  return { ok: true, data: { result: result.kind, detail, status: data, siteVerified: Boolean(row.site_verified_at) } }
}

export async function applyProjectUrl(id: string): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const { error } = await createAdminClient().rpc('subdomain_set_url', { p_user: user.id, p_id: id })
  if (error) return rpcError('subdomain_set_url', error)
  done()
  revalidatePath('/explore')
  revalidatePath('/projects/[id]', 'page')
  return { ok: true, data: null }
}

async function removeRecords(ids: string[], tag: string) {
  if (!ids.length) return
  try {
    await removeCloudflare(ids)
  } catch (e) {
    // DB 는 이미 반납 상태 — 남은 레코드·목록 항목은 매일 점검이 comment 로 찾아 지운다
    console.error(`[domains] ${tag}: Cloudflare 레코드 삭제 실패, 매일 점검이 정리`, e)
  }
}

export async function releaseSubdomain(id: string): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const { data, error } = await createAdminClient().rpc('subdomain_release', { p_actor: user.id, p_id: id, p_reason: 'owner' })
  if (error) return rpcError('subdomain_release', error)
  await removeRecords(data ?? [], 'release')
  done()
  return { ok: true, data: null }
}

export async function revokeSubdomain(id: string, reason: string): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  if (!isDeveloper(user.email)) return { ok: false, error: RPC_ERRORS.not_admin }
  const { data, error } = await createAdminClient().rpc('subdomain_revoke', { p_admin: user.id, p_id: id, p_reason: reason })
  if (error) return rpcError('subdomain_revoke', error)
  await removeRecords(data ?? [], 'revoke')
  done()
  return { ok: true, data: null }
}

export async function unblockSubdomain(id: string): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  if (!isDeveloper(user.email)) return { ok: false, error: RPC_ERRORS.not_admin }
  const { error } = await createAdminClient().rpc('subdomain_unblock', { p_admin: user.id, p_id: id })
  if (error) return rpcError('subdomain_unblock', error)
  done()
  return { ok: true, data: null }
}
