'use server'

// 주소 받기 서버 액션. (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.
// 순서는 항상: getUser() → 학교 계정 확인 → 입력 검사 → 서비스 키로 subdomain_* 함수(안에서 소유자·관리자 재확인)
// → Cloudflare. DB 함수가 마지막 방어선이고, 여기의 검사는 빠른 실패·친절한 문구를 위한 것.
// 설계: docs/superpowers/specs/2026-10-25-subdomain-lending-design.md

import { revalidatePath } from 'next/cache'

import { isAllowedEmail, isDeveloper } from '@/lib/constants'
import { assertSafePublicUrl } from '@/lib/ssrf-guard'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SubdomainStatus } from '@/lib/types'

import { getDnsClient } from './cloudflare'
import { buildRecords, runConnect } from './connect'
import { createSiteFetcher } from './fetch-site'
import { HOST_PRESETS, validateTarget, validateTxt, type HostKey, type TxtInput } from './hosts'
import { normalizeName, ROOT_DOMAIN, validateName } from './name'
import { checkSite, type CheckResult } from './verify'

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

const UNKNOWN = '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.'

// subdomain_* 함수가 P0001 로 던지는 코드 → 문구
const RPC_ERRORS: Record<string, string> = {
  not_owner: '내 프로젝트의 주소만 다룰 수 있어요.',
  not_website: '방문 주소가 있는 웹사이트 프로젝트만 주소를 받을 수 있어요.',
  name_invalid: '이름은 3~30자의 영어 소문자·숫자·하이픈(-)으로 적어요. 하이픈으로 시작하거나 끝날 수 없어요.',
  name_reserved: '이 이름은 사이트에서 쓰려고 남겨 둔 이름이에요. 다른 이름을 골라요.',
  name_taken: '이미 누가 쓰고 있는 이름이에요.',
  project_has_subdomain: '이 프로젝트에는 이미 주소가 있어요.',
  limit: '주소는 한 사람당 3개까지 받을 수 있어요.',
  not_live: '이미 반납되었거나 회수된 주소예요.',
  target_invalid: 'CNAME 값이 고른 호스트의 주소가 아니에요. 호스트가 보여 준 값을 그대로 붙여 넣어요.',
  txt_invalid: 'TXT 확인값이 이 주소의 것이 아니에요. 호스트가 보여 준 값을 그대로 붙여 넣어요.',
  txt_missing: '이 호스트는 TXT 확인값이 있어야 연결돼요. 호스트가 보여 준 값을 붙여 넣어요.',
  not_active: '연결이 확인된 주소만 방문 주소로 바꿀 수 있어요.',
  not_admin: '관리자만 할 수 있어요.',
  reason_invalid: '회수 이유를 1~200자로 적어 주세요.',
  not_revoked: '회수된 주소가 아니에요.',
  not_found: '주소를 찾지 못했어요.',
}

const NAME_REASONS: Record<'length' | 'chars' | 'reserved', string> = {
  length: '이름은 3~30자로 적어요.',
  chars: '영어 소문자·숫자·하이픈(-)만 쓸 수 있고, 하이픈으로 시작하거나 끝날 수 없어요.',
  reserved: '사이트에서 쓰려고 남겨 둔 이름이에요.',
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
    .select('id, name, owner_id, project_id, status, host, verify_token, cf_record_ids')
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

  const { data, error } = await createAdminClient().rpc('subdomain_reserve', { p_user: user.id, p_project: projectId, p_name: name })
  if (error) return rpcError('subdomain_reserve', error)
  done()
  return { ok: true, data: { id: data } }
}

export async function connectHost(id: string, host: HostKey, rawTarget: string, rawTxt: TxtInput[]): Promise<ActionResult> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  if (!Object.hasOwn(HOST_PRESETS, host)) return { ok: false, error: RPC_ERRORS.target_invalid }

  const row = await loadRow(id)
  if (!row || row.owner_id !== user.id) return { ok: false, error: RPC_ERRORS.not_owner }
  if (!['reserved', 'pending', 'active', 'broken'].includes(row.status)) return { ok: false, error: RPC_ERRORS.not_live }

  const target = validateTarget(host, rawTarget)
  if (!target) return { ok: false, error: RPC_ERRORS.target_invalid }
  const filled = rawTxt.filter((t) => t.name.trim() || t.value.trim())
  if (filled.length > 2) return { ok: false, error: RPC_ERRORS.txt_invalid }
  const txt: TxtInput[] = []
  for (const t of filled) {
    const ok = validateTxt(host, row.name, t)
    if (!ok) return { ok: false, error: RPC_ERRORS.txt_invalid }
    txt.push(ok)
  }
  if (HOST_PRESETS[host].txt?.required && txt.length === 0) return { ok: false, error: RPC_ERRORS.txt_missing }

  try {
    const dns = getDnsClient()
    // 다시 연결하는 경우 옛 레코드부터 지운다(같은 이름의 CNAME 은 하나만 둘 수 있다)
    if (row.cf_record_ids.length) await dns.remove(row.cf_record_ids)

    const admin = createAdminClient()
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
    return { ok: false, error: 'DNS 레코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.' }
  }
  done()
  return { ok: true, data: null }
}

// result 가 unreachable 일 때만 detail(예: "status 404", "redirect to another host") — 왜 안 열리는지 화면에 보여 주려고
export async function verifySubdomain(
  id: string,
): Promise<ActionResult<{ result: CheckResult['kind']; detail: string | null; status: SubdomainStatus }>> {
  const user = await currentUser()
  if (!user) return LOGIN_REQUIRED
  const row = await loadRow(id)
  if (!row || row.owner_id !== user.id) return { ok: false, error: RPC_ERRORS.not_owner }
  if (!row.host) return { ok: false, error: '먼저 2단계에서 호스트에 연결해요.' }

  const fqdn = `${row.name}.${ROOT_DOMAIN}`
  // 대상은 우리 주소지만 CNAME 이 바깥을 가리킨다 — 사설 IP 로 풀리면 요청하지 않는다
  const safe = await assertSafePublicUrl(`https://${fqdn}/`)
  const result: CheckResult = safe.ok
    ? await checkSite(fqdn, row.verify_token, row.host, createSiteFetcher())
    : { kind: 'unreachable', detail: safe.reason }

  const { data, error } = await createAdminClient().rpc('subdomain_record_check', {
    p_id: id,
    p_ok: result.kind === 'ok',
    p_now: new Date().toISOString(),
  })
  if (error) return rpcError('subdomain_record_check', error)
  // 화면이 자동으로 반복 확인하므로, 상태가 그대로면 페이지를 다시 그리게 하지 않는다
  if (data !== row.status) done()
  return {
    ok: true,
    data: { result: result.kind, detail: result.kind === 'unreachable' ? result.detail.slice(0, 120) : null, status: data },
  }
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
    await getDnsClient().remove(ids)
  } catch (e) {
    // DB 는 이미 반납 상태 — 남은 레코드는 매일 점검이 comment 로 찾아 지운다
    console.error(`[domains] ${tag}: DNS 레코드 삭제 실패, 매일 점검이 정리`, e)
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
