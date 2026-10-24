import 'server-only'

import { revertedBy } from '@/lib/guide-wiki/diff'
import { loadSourceDoc, sourceHash } from '@/lib/guide-wiki/source'
import { HISTORY_PAGE_SIZE } from '@/lib/guide-wiki/types'
import type { RevisionStats, WikiDoc, WikiStep } from '@/lib/guide-wiki/types'
import { createClient } from '@/lib/supabase/server'
import type { GuideRevisionKind, Json } from '@/lib/types'

const DEFAULT_LIST_LIMIT = HISTORY_PAGE_SIZE
const WITHDRAWN_NICKNAME = '탈퇴한 사용자'

export type RevisionListItem = {
  revNo: number
  kind: GuideRevisionKind
  summary: string
  stats: RevisionStats
  revertOf: number | null
  createdAt: string
  author: {
    id: string | null
    /** 작성자 행이 지워졌으면 null (화면에서 "탈퇴한 사용자"). */
    nickname: string | null
    avatarUrl: string | null
    email: string
  }
}

// users 는 FK 이름을 명시해야 모호성 오류(PGRST201)가 나지 않는다.
const ITEM_COLUMNS =
  'rev_no, kind, summary, stats, revert_of, created_at, author_id, author_email, author:users!guide_revisions_author_id_fkey(id, nickname, full_name, avatar_url)'
const DOC_COLUMNS = `${ITEM_COLUMNS}, title, steps, extra`

type AuthorJoin = {
  id: string
  nickname: string | null
  full_name: string | null
  avatar_url: string | null
} | null

type ItemRow = {
  rev_no: number
  kind: GuideRevisionKind
  summary: string
  stats: Json
  revert_of: number | null
  created_at: string
  author_id: string | null
  author_email: string
  author: AuthorJoin
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function toStats(json: Json): RevisionStats {
  const o = isRecord(json) ? json : {}
  const num = (k: string): number => (typeof o[k] === 'number' ? (o[k] as number) : 0)
  const stats: RevisionStats = {
    added: num('added'),
    removed: num('removed'),
    edited: num('edited'),
    moved: num('moved'),
    plus: num('plus'),
    minus: num('minus'),
  }
  if (typeof o.sourceHash === 'string') stats.sourceHash = o.sourceHash
  return stats
}

function toSteps(json: Json): WikiStep[] {
  if (!Array.isArray(json)) return []
  const out: WikiStep[] = []
  for (const s of json) {
    if (isRecord(s) && typeof s.id === 'string' && typeof s.body === 'string') {
      out.push({ id: s.id, body: s.body })
    }
  }
  return out
}

function emailLocalPart(email: string): string {
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}

function toItem(row: ItemRow): RevisionListItem {
  const a = row.author
  return {
    revNo: row.rev_no,
    kind: row.kind,
    summary: row.summary,
    stats: toStats(row.stats),
    revertOf: row.revert_of,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      nickname: a ? (a.nickname ?? a.full_name ?? emailLocalPart(row.author_email)) : null,
      avatarUrl: a?.avatar_url ?? null,
      email: row.author_email,
    },
  }
}

function toDoc(
  key: string,
  row: { title: string; steps: Json; extra: Json | null },
): WikiDoc {
  return { key, title: row.title, steps: toSteps(row.steps), extra: row.extra }
}

/** DB 최신 버전. DB에 행이 없으면 저장소 원본을 `revNo: 0` 으로. 원본도 없으면 null. */
export async function getLatestDoc(
  key: string,
): Promise<{ doc: WikiDoc; revNo: number } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guide_revisions')
    .select('rev_no, title, steps, extra')
    .eq('doc_key', key)
    .order('rev_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`guide_revisions 조회 실패: ${error.message}`)
  if (data) return { doc: toDoc(key, data), revNo: data.rev_no }

  const source = await loadSourceDoc(key)
  return source ? { doc: source, revNo: 0 } : null
}

/** 문서 요약(최신 번호·마지막 편집자·기여자 수). DB에 행이 없으면 null. */
export async function getDocMeta(key: string): Promise<{
  latestRev: number
  lastAuthor: { id: string | null; nickname: string } | null
  lastAt: string | null
  contributors: number
} | null> {
  const supabase = await createClient()
  const [latest, emails] = await Promise.all([
    supabase
      .from('guide_revisions')
      .select(ITEM_COLUMNS)
      .eq('doc_key', key)
      .order('rev_no', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('guide_revisions').select('author_email').eq('doc_key', key),
  ])
  if (latest.error) throw new Error(`guide_revisions 조회 실패: ${latest.error.message}`)
  if (emails.error) throw new Error(`guide_revisions 조회 실패: ${emails.error.message}`)
  if (!latest.data) return null

  const item = toItem(latest.data)
  return {
    latestRev: item.revNo,
    lastAuthor: { id: item.author.id, nickname: item.author.nickname ?? WITHDRAWN_NICKNAME },
    lastAt: item.createdAt,
    contributors: new Set((emails.data ?? []).map((r) => r.author_email)).size,
  }
}

/** 최신순 버전 목록. `before` 는 rev_no < before (키셋 페이지네이션). */
export async function listRevisions(
  key: string,
  opts: { before?: number; limit?: number } = {},
): Promise<RevisionListItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('guide_revisions')
    .select(ITEM_COLUMNS)
    .eq('doc_key', key)
    .order('rev_no', { ascending: false })
    .limit(opts.limit ?? DEFAULT_LIST_LIMIT)
  if (opts.before !== undefined) query = query.lt('rev_no', opts.before)

  const { data, error } = await query
  if (error) throw new Error(`guide_revisions 조회 실패: ${error.message}`)
  return (data ?? []).map(toItem)
}

/** 고친 기록 한 쪽(최신순). 한 개 더 읽어 다음 쪽이 있는지 알려 준다. */
export async function listHistoryPage(
  key: string,
  before?: number,
): Promise<{ items: RevisionListItem[]; hasMore: boolean }> {
  const rows = await listRevisions(key, { before, limit: HISTORY_PAGE_SIZE + 1 })
  return { items: rows.slice(0, HISTORY_PAGE_SIZE), hasMore: rows.length > HISTORY_PAGE_SIZE }
}

/** 특정 버전의 문서 내용과 목록 항목 정보. */
export async function getRevision(
  key: string,
  revNo: number,
): Promise<{ doc: WikiDoc; item: RevisionListItem } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guide_revisions')
    .select(DOC_COLUMNS)
    .eq('doc_key', key)
    .eq('rev_no', revNo)
    .maybeSingle()
  if (error) throw new Error(`guide_revisions 조회 실패: ${error.message}`)
  if (!data) return null
  return { doc: toDoc(key, data), item: toItem(data) }
}

/** revNo -> 그 버전을 무효로 만든 revert 의 revNo. */
export async function getRevertedMap(key: string): Promise<Map<number, number>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guide_revisions')
    .select('rev_no, kind, revert_of')
    .eq('doc_key', key)
  if (error) throw new Error(`guide_revisions 조회 실패: ${error.message}`)
  return revertedBy(
    (data ?? []).map((r) => ({ revNo: r.rev_no, kind: r.kind, revertOf: r.revert_of })),
  )
}

/** 마지막 seed/sync 이후 저장소 원본이 바뀌었는지. 위키 저장본이 없거나 원본이 없으면 false. */
export async function isSourceStale(key: string): Promise<boolean> {
  const source = await loadSourceDoc(key)
  if (!source) return false

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guide_revisions')
    .select('stats')
    .eq('doc_key', key)
    .in('kind', ['seed', 'sync'])
    .order('rev_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`guide_revisions 조회 실패: ${error.message}`)
  if (!data) return false

  return toStats(data.stats).sourceHash !== sourceHash(source)
}
