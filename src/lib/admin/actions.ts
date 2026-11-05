'use server'

// 관리자 대시보드의 대응 버튼. 액션마다 requireAdmin() 으로 다시 확인한 뒤 서비스 키로 실행하고 admin_actions 에 남긴다.
// 지운 글 내용은 기록하지 않는다. (nav) 밖에 둔다 — Turbopack client→server action 바인딩 문제.

import { revalidatePath } from 'next/cache'

import { isDeveloper } from '@/lib/constants'
import { getLatestDoc } from '@/lib/guide-wiki/read'
import { revertGuide } from '@/lib/guide-wiki/actions'
import { closeDomainOfPrivateProject } from '@/lib/projects/actions'
import { releaseLiveDomain } from '@/lib/projects/release-domain'
import { createAdminClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/lib/types'

import { banUntil, type BanDuration } from './ban'
import { requireAdmin } from './guard'
import { loadFeed } from './read'
import type { ContentKind, FeedItem } from './today'

export type AdminActionResult = { ok: true } | { ok: false; error: string }

const NOT_ADMIN: AdminActionResult = { ok: false, error: '관리자만 할 수 있어요.' }
const FAILED: AdminActionResult = { ok: false, error: '처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.' }

type Admin = ReturnType<typeof createAdminClient>
type ActionLog = Database['public']['Tables']['admin_actions']['Insert']

const CONTENT_KINDS: ContentKind[] = ['project', 'project_comment', 'tip', 'tip_comment', 'idea', 'guide', 'profile']
const BAN_DURATIONS: BanDuration[] = ['1d', '7d', '30d', 'forever']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const TABLE: Record<Exclude<ContentKind, 'guide' | 'profile'>, 'projects' | 'project_comments' | 'tips' | 'tip_comments' | 'ideas'> = {
  project: 'projects',
  project_comment: 'project_comments',
  tip: 'tips',
  tip_comment: 'tip_comments',
  idea: 'ideas',
}

function valid(kind: string, id: string): kind is ContentKind {
  return CONTENT_KINDS.includes(kind as ContentKind) && UUID.test(id)
}

async function record(admin: Admin, row: ActionLog) {
  const { error } = await admin.from('admin_actions').insert(row)
  if (error) console.error('[admin] 기록 실패', error.message)
}

function done(): AdminActionResult {
  revalidatePath('/admin')
  return { ok: true }
}

async function deleteOne(admin: Admin, actorId: string, kind: ContentKind, id: string): Promise<AdminActionResult> {
  if (kind === 'guide') return { ok: false, error: '위키 수정은 되돌리기로 처리해요.' }
  if (kind === 'profile') {
    // 계정은 두고 닉네임·소개만 비운다 — 다음 접속 때 닉네임을 다시 정한다
    const { error } = await admin.from('users').update({ nickname: null, bio: null }).eq('id', id)
    return error ? FAILED : { ok: true }
  }
  if (kind === 'project') {
    // 주소가 남은 프로젝트는 삭제 트리거가 막는다 — 먼저 반납
    if (!(await releaseLiveDomain(admin, actorId, id, 'admin_deleted'))) return FAILED
  }
  const { error } = await admin.from(TABLE[kind]).delete().eq('id', id)
  if (error) {
    console.error('[admin] 삭제 실패', kind, error.message)
    return FAILED
  }
  return { ok: true }
}

export async function adminDeleteContent(kind: ContentKind, id: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!valid(kind, id)) return FAILED
  const admin = createAdminClient()
  const res = await deleteOne(admin, actor.id, kind, id)
  if (!res.ok) return res
  await record(admin, { action: 'delete', target_kind: kind, target_id: id })
  revalidatePath('/explore')
  return done()
}

/** 몰아 올린 묶음에서 가장 먼저 올린 하나만 남기고 지운다 */
export async function adminDeleteBurstExceptFirst(kind: ContentKind, items: { id: string; createdAt: string }[]): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (items.length < 2 || !items.every((i) => valid(kind, i.id))) return FAILED
  const admin = createAdminClient()
  const [, ...rest] = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const i of rest) {
    const res = await deleteOne(admin, actor.id, kind, i.id)
    if (!res.ok) return res
    await record(admin, { action: 'delete', target_kind: kind, target_id: i.id, detail: { burst: true } })
  }
  revalidatePath('/explore')
  return done()
}

/** 글의 작성자와 익명 여부를 서버에서 다시 찾는다 — 화면에는 작성자 id 를 넘기지 않는다 */
async function authorOf(admin: Admin, kind: ContentKind, id: string): Promise<{ userId: string; anonymous: boolean } | null> {
  switch (kind) {
    case 'project': {
      const { data } = await admin.from('projects').select('author_id, author_role').eq('id', id).maybeSingle()
      return data ? { userId: data.author_id, anonymous: data.author_role === 'anonymous' } : null
    }
    case 'project_comment': {
      const { data } = await admin.from('project_comments').select('user_id, public_user_id').eq('id', id).maybeSingle()
      return data ? { userId: data.user_id, anonymous: data.public_user_id === null } : null
    }
    case 'tip': {
      const { data } = await admin.from('tips').select('author_id').eq('id', id).maybeSingle()
      return data ? { userId: data.author_id, anonymous: false } : null
    }
    case 'tip_comment': {
      const { data } = await admin.from('tip_comments').select('user_id').eq('id', id).maybeSingle()
      return data ? { userId: data.user_id, anonymous: false } : null
    }
    case 'idea': {
      const { data } = await admin.from('ideas').select('author_id').eq('id', id).maybeSingle()
      return data ? { userId: data.author_id, anonymous: false } : null
    }
    case 'guide': {
      const { data } = await admin.from('guide_revisions').select('author_id').eq('id', id).maybeSingle()
      return data?.author_id ? { userId: data.author_id, anonymous: false } : null
    }
    case 'profile':
      return { userId: id, anonymous: false }
  }
}

async function ban(
  admin: Admin,
  actorId: string,
  target: { userId: string; anonymous: boolean },
  duration: BanDuration,
  reason: string,
  source: { kind: string; id: string } | null,
): Promise<AdminActionResult> {
  if (!BAN_DURATIONS.includes(duration)) return FAILED
  if (target.userId === actorId) return { ok: false, error: '나는 차단할 수 없어요.' }
  const { data: authUser } = await admin.auth.admin.getUserById(target.userId)
  const email = authUser?.user?.email
  if (!email) return { ok: false, error: '사용자를 찾지 못했어요.' }
  if (isDeveloper(email)) return { ok: false, error: '관리자 계정은 차단할 수 없어요.' }

  const { data: hash, error: hashError } = await admin.rpc('email_hash', { p_email: email })
  if (hashError || !hash) return FAILED
  const until = banUntil(duration, new Date())
  const trimmed = reason.trim().slice(0, 200) || null
  const { error } = await admin.from('user_bans').insert({
    user_id: target.userId,
    email_hash: hash,
    until: until?.toISOString() ?? null,
    reason: trimmed,
    from_anonymous: target.anonymous,
    created_by: actorId,
  })
  if (error) {
    console.error('[admin] 차단 실패', error.message)
    return FAILED
  }
  const detail: Json = { duration, ...(source ? { from: `${source.kind}:${source.id}` } : {}) }
  await record(admin, { action: 'ban', target_kind: 'user', target_id: target.userId, target_user_id: target.userId, detail })
  return done()
}

export async function adminBanByContent(kind: ContentKind, id: string, duration: BanDuration, reason: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!valid(kind, id)) return FAILED
  const admin = createAdminClient()
  const target = await authorOf(admin, kind, id)
  if (!target) return { ok: false, error: '글을 찾지 못했어요. 이미 지워졌을 수 있어요.' }
  return ban(admin, actor.id, target, duration, reason, { kind, id })
}

/** 끝난 차단을 다시 걸 때 — banId 로 사람을 찾는다(익명 표시는 그대로 이어받음) */
export async function adminRebanByBan(banId: string, duration: BanDuration, reason: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!UUID.test(banId)) return FAILED
  const admin = createAdminClient()
  const { data } = await admin.from('user_bans').select('user_id, from_anonymous').eq('id', banId).maybeSingle()
  if (!data?.user_id) return { ok: false, error: '탈퇴한 사람이라 다시 차단할 수 없어요.' }
  return ban(admin, actor.id, { userId: data.user_id, anonymous: data.from_anonymous }, duration, reason, { kind: 'ban', id: banId })
}

export async function adminBanUser(userId: string, duration: BanDuration, reason: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!UUID.test(userId)) return FAILED
  return ban(createAdminClient(), actor.id, { userId, anonymous: false }, duration, reason, null)
}

/** 지금 끝낸다 — 기록은 남김 */
export async function adminUnban(banId: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!UUID.test(banId)) return FAILED
  const admin = createAdminClient()
  const { data, error } = await admin.from('user_bans').update({ until: new Date().toISOString() }).eq('id', banId).select('user_id').maybeSingle()
  if (error || !data) return FAILED
  await record(admin, { action: 'unban', target_kind: 'ban', target_id: banId, target_user_id: data.user_id })
  return done()
}

export async function adminDismiss(key: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  const at = key.indexOf(':')
  if (at < 1 || at > 40 || key.length > 120) return FAILED
  const admin = createAdminClient()
  const { error } = await admin.from('admin_dismissals').upsert({ kind: key.slice(0, at), item_id: key.slice(at + 1) })
  if (error) return FAILED
  return done()
}

export async function adminMakeProjectPrivate(projectId: string): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  if (!UUID.test(projectId)) return FAILED
  const admin = createAdminClient()
  const { error } = await admin.from('projects').update({ visibility: 'private' }).eq('id', projectId)
  if (error) return FAILED
  // 비공개가 되면 주소도 닫는다(소유자 흐름과 같음, 관리자도 부를 수 있음)
  const closed = await closeDomainOfPrivateProject(projectId)
  await record(admin, { action: 'private', target_kind: 'project', target_id: projectId })
  revalidatePath('/explore')
  if (!closed.ok) return { ok: false, error: `비공개로 바꿨지만 주소는 닫지 못했어요. ${closed.error}` }
  return done()
}

/** 크게 지운 위키 수정을 바로 앞 버전으로 되돌린다. 그 뒤에 다른 수정이 있으면 기록 화면에서 직접 */
export async function adminRevertGuide(docKey: string, revNo: number): Promise<AdminActionResult> {
  const actor = await requireAdmin()
  if (!actor) return NOT_ADMIN
  const latest = await getLatestDoc(docKey)
  if (!latest || latest.revNo !== revNo) return { ok: false, error: '그 뒤에 다른 수정이 있어요. 기록 화면에서 직접 되돌려 주세요.' }
  const res = await revertGuide({ key: docKey, targetRev: revNo - 1, baseRev: revNo, reason: '관리자 되돌림' })
  if ('error' in res) return { ok: false, error: res.error }
  if ('conflict' in res) return { ok: false, error: '그 사이에 다른 수정이 저장됐어요. 새로 고쳐 주세요.' }
  await record(createAdminClient(), { action: 'revert', target_kind: 'guide', target_id: `${docKey}@${revNo}` })
  return done()
}

export async function adminFindUsers(query: string): Promise<{ id: string; name: string }[]> {
  const actor = await requireAdmin()
  if (!actor) return []
  const q = query.trim().replace(/[%_,()]/g, '')
  if (q.length < 1) return []
  const { data } = await createAdminClient()
    .from('users')
    .select('id, nickname, full_name')
    .or(`nickname.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(10)
  return (data ?? []).map((u) => ({ id: u.id, name: u.nickname || u.full_name || '이름 없음' }))
}

export async function loadMoreFeed(kinds: ContentKind[] | null, before: string): Promise<FeedItem[]> {
  const actor = await requireAdmin()
  if (!actor) return []
  if (kinds && !kinds.every((k) => CONTENT_KINDS.includes(k))) return []
  if (Number.isNaN(Date.parse(before))) return []
  return loadFeed(kinds, before)
}
