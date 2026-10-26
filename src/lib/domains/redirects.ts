// Cloudflare Bulk Redirects 목록 — 바로가기 주소(<이름>.dshs.dev → 학생 사이트 302)를 넣고 뺀다.
// 토큰은 계정의 "Account Filter Lists: Edit"(+ 규칙을 만들 때 "Mass URL Redirects: Write")만 있는 별도 토큰(CLOUDFLARE_LISTS_API_TOKEN). DNS 토큰과 나눠 둔다.
// 목록(dshs_subdomain_redirects)과 그 목록을 쓰는 Bulk Redirect 규칙은 scripts/create-redirect-list.mts 가 한 번 만든다.
// 추가·삭제는 비동기 작업이라 끝날 때까지 기다린다. 목록 전체를 바꾸는 PUT 은 동시 작업을 지울 수 있어 쓰지 않는다.
// 우리 항목은 comment "dshs-subdomain:<행 id>" 로 구분한다(DNS 레코드와 같은 표시 — 매일 점검이 고아를 찾을 때).
// 같은 source_url 을 다시 넣으면 새 항목이 아니라 기존 항목을 덮어쓴다(같은 id, 2026-10-26 실측).
// 설계: docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md 4.4

import { RECORD_COMMENT_PREFIX } from './cloudflare.ts'

const API = 'https://api.cloudflare.com/client/v4'
const ATTEMPTS = 3

export type RedirectItem = { id: string; source: string; comment: string; createdOn: string }

export type RedirectClient = {
  /** 항목을 넣고 작업이 끝나면 그 항목 id */
  add(item: { source: string; target: string }, rowId: string): Promise<string>
  remove(ids: string[]): Promise<void>
  listManaged(): Promise<RedirectItem[]>
}

export class RedirectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RedirectError'
  }
}

type CfResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T
  result_info?: { cursors?: { after?: string } }
}

type ApiItem = { id: string; comment?: string; created_on?: string; redirect?: { source_url?: string } }

/** 목록 POST 배열의 원소 하나. 302 — 301 은 브라우저가 오래 기억해서 보낼 곳을 바꿔도 안 바뀐다 */
export function redirectItemBody(source: string, target: string, rowId: string) {
  return {
    redirect: {
      source_url: source,
      target_url: target,
      status_code: 302,
      subpath_matching: true,
      preserve_path_suffix: true,
      preserve_query_string: true,
      include_subdomains: false,
    },
    comment: RECORD_COMMENT_PREFIX + rowId,
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function createRedirectClient(opts: {
  token: string
  accountId: string
  listId: string
  fetch?: typeof fetch
  pollMs?: number
  maxWaitMs?: number
}): RedirectClient {
  const f = opts.fetch ?? fetch
  const pollMs = opts.pollMs ?? 500
  const maxWaitMs = opts.maxWaitMs ?? 10_000
  const lists = `${API}/accounts/${opts.accountId}/rules/lists`
  const items = `${lists}/${opts.listId}/items`

  async function call<T>(method: string, url: string, body?: unknown): Promise<{ status: number; data: CfResponse<T> | null }> {
    const res = await f(url, {
      method,
      headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    const data = (await res.json().catch(() => null)) as CfResponse<T> | null
    return { status: res.status, data }
  }

  function describe(status: number, data: CfResponse<unknown> | null): string {
    const first = data?.errors?.[0]
    return first ? `cloudflare ${status} ${first.code} ${first.message}` : `cloudflare ${status}`
  }

  // 목록에 진행 중인 작업이 있으면 거절될 수 있어 짧게 다시 시도한다
  async function startOperation(method: 'POST' | 'DELETE', body: unknown): Promise<string> {
    let last = ''
    for (let i = 0; i < ATTEMPTS; i++) {
      if (i) await sleep(pollMs)
      const { status, data } = await call<{ operation_id: string }>(method, items, body)
      if (data?.success && data.result?.operation_id) return data.result.operation_id
      last = describe(status, data)
    }
    throw new RedirectError(last)
  }

  async function waitFor(operationId: string): Promise<void> {
    const started = Date.now()
    for (;;) {
      const { status, data } = await call<{ status: string; error?: string }>('GET', `${lists}/bulk_operations/${encodeURIComponent(operationId)}`)
      if (!data?.success) throw new RedirectError(describe(status, data))
      if (data.result.status === 'completed') return
      if (data.result.status === 'failed') throw new RedirectError(`bulk operation failed: ${data.result.error ?? 'unknown'}`)
      if (Date.now() - started > maxWaitMs) throw new RedirectError('bulk operation timeout')
      await sleep(pollMs)
    }
  }

  return {
    async add(item, rowId) {
      const op = await startOperation('POST', [redirectItemBody(item.source, item.target, rowId)])
      await waitFor(op)
      const { status, data } = await call<ApiItem[]>('GET', `${items}?search=${encodeURIComponent(item.source)}`)
      if (!data?.success) throw new RedirectError(describe(status, data))
      const found = data.result.find((r) => r.comment === RECORD_COMMENT_PREFIX + rowId)
      if (!found) throw new RedirectError('added item not found')
      return found.id
    },

    async remove(ids) {
      if (!ids.length) return
      await waitFor(await startOperation('DELETE', { items: ids.map((id) => ({ id })) }))
    },

    async listManaged() {
      const out: RedirectItem[] = []
      let cursor: string | undefined
      do {
        const q = new URLSearchParams({ per_page: '500' })
        if (cursor) q.set('cursor', cursor)
        const { status, data } = await call<ApiItem[]>('GET', `${items}?${q}`)
        if (!data?.success) throw new RedirectError(describe(status, data))
        for (const r of data.result) {
          if (r.comment?.startsWith(RECORD_COMMENT_PREFIX)) out.push({ id: r.id, source: r.redirect?.source_url ?? '', comment: r.comment, createdOn: r.created_on ?? '' })
        }
        cursor = data.result_info?.cursors?.after
      } while (cursor)
      return out
    },
  }
}

// 개발에서 쓰는 메모리 가짜 — 실제 목록은 건드리지 않는다
function createFakeRedirectClient(): RedirectClient {
  const store = new Map<string, RedirectItem>()
  let seq = 0
  return {
    async add(item, rowId) {
      const id = `fake-redirect-${++seq}`
      store.set(id, { id, source: item.source, comment: RECORD_COMMENT_PREFIX + rowId, createdOn: new Date().toISOString() })
      console.log(`[redirect:fake] add ${item.source} -> ${item.target} (${id})`)
      return id
    },
    async remove(ids) {
      for (const id of ids) store.delete(id)
      if (ids.length) console.log(`[redirect:fake] remove ${ids.join(', ')}`)
    },
    async listManaged() {
      return [...store.values()]
    },
  }
}

let fakeClient: RedirectClient | undefined

const isReal = () => process.env.NODE_ENV === 'production' || process.env.DOMAINS_REAL_DNS === '1'

/** 바로가기를 만들 수 있는가 — 운영에 목록 env 가 없으면 연결하기에서 미리 막는다 */
export function redirectConfigured(): boolean {
  if (!isReal()) return true
  return Boolean(process.env.CLOUDFLARE_LISTS_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_REDIRECT_LIST_ID)
}

// getDnsClient 와 같은 규칙: 운영은 진짜, 개발(next dev)은 가짜. 개발에서 진짜로 해 보려면 DOMAINS_REAL_DNS=1.
export function getRedirectClient(): RedirectClient {
  if (!isReal()) {
    fakeClient ??= createFakeRedirectClient()
    return fakeClient
  }
  const token = process.env.CLOUDFLARE_LISTS_API_TOKEN
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const listId = process.env.CLOUDFLARE_REDIRECT_LIST_ID
  if (!token || !accountId || !listId) {
    throw new RedirectError('CLOUDFLARE_LISTS_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_REDIRECT_LIST_ID 가 설정되지 않았어요.')
  }
  return createRedirectClient({ token, accountId, listId })
}
