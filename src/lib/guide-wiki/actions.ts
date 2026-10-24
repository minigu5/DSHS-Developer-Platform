'use server'

import { revalidatePath } from 'next/cache'

import { isAllowedEmail } from '@/lib/constants'
import { computeStats } from '@/lib/guide-wiki/diff'
import { getLatestDoc, getRevision, isSourceStale } from '@/lib/guide-wiki/read'
import {
  EditInputSchema,
  RevertInputSchema,
  SyncInputSchema,
  type EditInput,
  type RevertInput,
  type SyncInput,
} from '@/lib/guide-wiki/schema'
import { loadSourceDoc, sourceHash } from '@/lib/guide-wiki/source'
import type { RevisionStats, WikiDoc, WikiStep } from '@/lib/guide-wiki/types'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/types'

export type SaveResult =
  | { revNo: number }
  | { error: string }
  | { conflict: { latestRev: number } }

const UNKNOWN_ERROR = '저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.'
const SYNC_SUMMARY = '저장소 원본 가져오기'

// save_guide_revision() 이 P0001 로 던지는 메시지 -> 사용자에게 보여 줄 문구
const RPC_ERRORS: Record<string, string> = {
  steps_invalid: '단계 내용이 너무 길거나 형식이 맞지 않아요.',
  title_invalid: '제목은 1자 이상 120자 이하로 적어 주세요.',
  stats_invalid: '변경 내용을 계산하지 못했어요. 새로고침한 뒤 다시 시도해 주세요.',
  seed_invalid: '저장소 원본을 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.',
  seed_required: '저장소 원본을 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.',
  author_invalid: '학교 계정으로 로그인해야 저장할 수 있어요.',
  doc_key_invalid: '문서 주소가 올바르지 않아요.',
  summary_invalid: '고친 내용은 1자 이상 100자 이하로 적어 주세요.',
  revert_invalid: '이 버전으로는 되돌릴 수 없어요.',
  kind_invalid: UNKNOWN_ERROR,
}

function zeroStats(): RevisionStats {
  return { added: 0, removed: 0, edited: 0, moved: 0, plus: 0, minus: 0 }
}

function statsJson(stats: RevisionStats, hash?: string): Json {
  const out: { [key: string]: Json } = {
    added: stats.added,
    removed: stats.removed,
    edited: stats.edited,
    moved: stats.moved,
    plus: stats.plus,
    minus: stats.minus,
  }
  if (hash !== undefined) out.sourceHash = hash
  return out
}

function stepsJson(steps: WikiStep[]): Json {
  return steps.map((s) => ({ id: s.id, body: s.body }))
}

// extra 는 DB 에서 읽은 JSON 이거나 null. 타입만 좁힌다.
function extraJson(extra: unknown): Json | null {
  return extra === undefined || extra === null ? null : (extra as Json)
}

function isUnchanged(stats: RevisionStats): boolean {
  return (
    stats.added === 0 &&
    stats.removed === 0 &&
    stats.edited === 0 &&
    stats.moved === 0 &&
    stats.plus === 0 &&
    stats.minus === 0
  )
}

type Actor = { id: string }

async function currentActor(): Promise<Actor | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요해요.' }
  if (!isAllowedEmail(user.email)) return { error: '학교 계정으로 로그인해야 저장할 수 있어요.' }
  return { id: user.id }
}

type Commit = {
  actor: Actor
  key: string
  baseRev: number
  kind: 'edit' | 'revert' | 'sync'
  doc: Pick<WikiDoc, 'title' | 'steps' | 'extra'>
  summary: string
  revertOf: number | null
  stats: Json
  /** 직전 최신 버전. revNo 0 이면 DB 에 행이 없고 doc 는 저장소 원본. */
  latest: { doc: WikiDoc; revNo: number }
}

async function commit(c: Commit): Promise<SaveResult> {
  // 첫 저장이면 저장소 원본을 rev 1 (seed) 로 함께 남긴다.
  const seed: Json | null =
    c.latest.revNo === 0
      ? {
          title: c.latest.doc.title,
          steps: stepsJson(c.latest.doc.steps),
          extra: extraJson(c.latest.doc.extra),
          stats: statsJson(zeroStats(), sourceHash(c.latest.doc)),
        }
      : null

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('save_guide_revision', {
    p_author_id: c.actor.id,
    p_doc_key: c.key,
    p_base_rev: c.baseRev,
    p_kind: c.kind,
    p_title: c.doc.title,
    p_steps: stepsJson(c.doc.steps),
    p_extra: extraJson(c.doc.extra),
    p_summary: c.summary,
    p_revert_of: c.revertOf,
    p_stats: c.stats,
    p_seed: seed,
  })

  if (error) {
    console.error('[guide-wiki] save_guide_revision 실패', error)
    const message = error.message.trim()
    const conflict = /^conflict:(\d+)$/.exec(message)
    if (conflict) return { conflict: { latestRev: Number(conflict[1]) } }
    return { error: RPC_ERRORS[message] ?? UNKNOWN_ERROR }
  }
  if (typeof data !== 'number') {
    console.error('[guide-wiki] save_guide_revision 반환값 이상', data)
    return { error: UNKNOWN_ERROR }
  }

  revalidatePath('/guide', 'layout')
  revalidatePath('/guide-wiki/' + c.key, 'layout')
  return { revNo: data }
}

export async function saveGuideEdit(input: EditInput): Promise<SaveResult> {
  const actor = await currentActor()
  if ('error' in actor) return actor

  const parsed = EditInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않아요.' }
  }
  const { key, baseRev, title, steps, summary } = parsed.data

  const latest = await getLatestDoc(key)
  if (!latest) return { error: '문서를 찾을 수 없어요.' }
  if (latest.revNo !== baseRev) return { conflict: { latestRev: latest.revNo } }

  const stats = computeStats(latest.doc.steps, steps)
  if (isUnchanged(stats) && title === latest.doc.title) {
    return { error: '바뀐 점이 없어요.' }
  }

  return commit({
    actor,
    key,
    baseRev,
    kind: 'edit',
    doc: { title, steps, extra: latest.doc.extra },
    summary,
    revertOf: null,
    stats: statsJson(stats),
    latest,
  })
}

export async function revertGuide(input: RevertInput): Promise<SaveResult> {
  const actor = await currentActor()
  if ('error' in actor) return actor

  const parsed = RevertInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않아요.' }
  }
  const { key, targetRev, baseRev, reason } = parsed.data

  const latest = await getLatestDoc(key)
  if (!latest) return { error: '문서를 찾을 수 없어요.' }
  if (latest.revNo === 0) return { error: '되돌릴 수 있는 이전 버전이 없어요.' }
  if (latest.revNo !== baseRev) return { conflict: { latestRev: latest.revNo } }
  if (targetRev >= latest.revNo) return { error: '지금 버전으로는 되돌릴 수 없어요.' }

  const target = await getRevision(key, targetRev)
  if (!target) return { error: '되돌릴 버전을 찾을 수 없어요.' }

  return commit({
    actor,
    key,
    baseRev,
    kind: 'revert',
    doc: target.doc,
    summary: reason,
    revertOf: targetRev,
    stats: statsJson(computeStats(latest.doc.steps, target.doc.steps)),
    latest,
  })
}

export async function syncFromSource(input: SyncInput): Promise<SaveResult> {
  const actor = await currentActor()
  if ('error' in actor) return actor

  const parsed = SyncInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값이 올바르지 않아요.' }
  }
  const { key, baseRev } = parsed.data

  const latest = await getLatestDoc(key)
  if (!latest) return { error: '문서를 찾을 수 없어요.' }
  if (latest.revNo !== baseRev) return { conflict: { latestRev: latest.revNo } }

  if (!(await isSourceStale(key))) return { error: '저장소 원본이 바뀌지 않았어요.' }
  const source = await loadSourceDoc(key)
  if (!source) return { error: '저장소 원본을 찾을 수 없어요.' }

  return commit({
    actor,
    key,
    baseRev,
    kind: 'sync',
    doc: source,
    summary: SYNC_SUMMARY,
    revertOf: null,
    stats: statsJson(computeStats(latest.doc.steps, source.steps), sourceHash(source)),
    latest,
  })
}
