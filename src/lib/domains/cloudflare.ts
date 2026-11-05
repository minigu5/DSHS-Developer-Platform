// Cloudflare DNS API(v4) — dshs.dev 존에 학생 주소 레코드를 만들고 지운다.
// 토큰은 dshs.dev 존 DNS 편집만 되는 계정 토큰(CLOUDFLARE_DNS_API_TOKEN), 존은 CLOUDFLARE_ZONE_ID.
// CNAME·TXT 는 DNS only(proxied:false) — 프록시를 켜면 학생 호스트가 인증서를 못 받는다. 예외: 대곽나루 서버 주소(proxied CNAME, 레코드마다 proxied 로 지정).
// 바로가기 주소의 AAAA(100::)만 proxied — Bulk Redirects 는 Cloudflare 를 거치는 레코드에만 동작한다(redirects.ts).
// 우리가 만든 레코드는 comment "dshs-subdomain:<행 id>" 로 구분한다(매일 점검이 고아 레코드를 찾을 때).

const API = 'https://api.cloudflare.com/client/v4'
export const RECORD_COMMENT_PREFIX = 'dshs-subdomain:'

// Cloudflare 레코드·목록 항목 id 는 늘 32자. 개발(next dev)은 운영 DB 에 쓰면서 Cloudflare 는 가짜라
// `fake-1`·`fake-redirect-1` 같은 id 가 운영 행에 남을 수 있다 — Cloudflare 는 이런 id 삭제를 400/405 로 거절해
// 운영의 재연결·반납이 통째로 실패했다(2026-11-05 dorm). 실제로 없는 것이므로 지울 때 건너뛴다.
export const isCloudflareId = (id: string) => /^[a-zA-Z0-9]{32}$/.test(id)

// proxied 를 주지 않으면 AAAA 만 proxied(바로가기용). 대곽나루 주소는 CNAME 을 proxied 로 만든다(요청이 Cloudflare 터널을 거쳐야 하므로)
export type DnsRecordInput = { type: 'CNAME' | 'TXT' | 'AAAA'; name: string; content: string; proxied?: boolean }
export type ManagedRecord = { id: string; name: string; comment: string; createdOn: string }

export type DnsClient = {
  /** 모두 만들거나, 하나라도 실패하면 만든 것을 지우고 DnsError */
  create(rows: DnsRecordInput[], rowId: string): Promise<string[]>
  /** 이미 없는 레코드는 성공으로 본다 */
  remove(ids: string[]): Promise<void>
  listManaged(): Promise<ManagedRecord[]>
}

export class DnsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DnsError'
  }
}

type CfResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T
  result_info?: { page: number; total_pages: number }
}

export function createDnsClient(opts: { token: string; zoneId: string; fetch?: typeof fetch }): DnsClient {
  const f = opts.fetch ?? fetch
  const base = `${API}/zones/${opts.zoneId}/dns_records`

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

  const client: DnsClient = {
    async create(rows, rowId) {
      const ids: string[] = []
      for (const row of rows) {
        const comment = RECORD_COMMENT_PREFIX + rowId
        const body =
          row.type === 'TXT'
            ? { type: 'TXT', name: row.name, content: `"${row.content}"`, ttl: 1, comment }
            : { type: row.type, name: row.name, content: row.content, ttl: 1, proxied: row.proxied ?? row.type === 'AAAA', comment }
        let failure: string | null = null
        try {
          const { status, data } = await call<{ id: string }>('POST', base, body)
          if (data?.success && data.result?.id) ids.push(data.result.id)
          else failure = describe(status, data)
        } catch (e) {
          failure = e instanceof Error ? e.message : 'network'
        }
        if (failure) {
          await client.remove(ids).catch(() => {}) // 남은 것은 매일 점검이 정리
          throw new DnsError(failure)
        }
      }
      return ids
    },

    async remove(ids) {
      for (const id of ids.filter(isCloudflareId)) {
        const { status, data } = await call('DELETE', `${base}/${encodeURIComponent(id)}`)
        if (status === 404 || data?.success) continue
        throw new DnsError(describe(status, data))
      }
    },

    async listManaged() {
      const out: ManagedRecord[] = []
      for (let page = 1; ; page++) {
        const q = new URLSearchParams({ 'comment.startswith': RECORD_COMMENT_PREFIX, per_page: '100', page: String(page) })
        const { status, data } = await call<{ id: string; name: string; comment?: string; created_on?: string }[]>('GET', `${base}?${q}`)
        if (!data?.success) throw new DnsError(describe(status, data))
        for (const r of data.result) out.push({ id: r.id, name: r.name, comment: r.comment ?? '', createdOn: r.created_on ?? '' })
        if (!data.result_info || page >= data.result_info.total_pages) break
      }
      return out
    },
  }
  return client
}

// 개발에서 토큰이 없을 때 쓰는 메모리 가짜 — 실제 DNS 는 건드리지 않는다
function createFakeDnsClient(): DnsClient {
  const records = new Map<string, ManagedRecord>()
  let seq = 0
  return {
    async create(rows, rowId) {
      return rows.map((r) => {
        const id = `fake-${++seq}`
        records.set(id, { id, name: r.name, comment: RECORD_COMMENT_PREFIX + rowId, createdOn: new Date().toISOString() })
        console.log(`[dns:fake] create ${r.type} ${r.name} -> ${r.content} (${id})`)
        return id
      })
    },
    async remove(ids) {
      for (const id of ids) records.delete(id)
      if (ids.length) console.log(`[dns:fake] remove ${ids.join(', ')}`)
    },
    async listManaged() {
      return [...records.values()]
    },
  }
}

let fakeClient: DnsClient | undefined

// 운영은 진짜 API. 개발(next dev)은 .env.local 에 토큰이 있어도 가짜를 쓴다 — 실수로 운영 DNS 를 바꾸지 않게.
// 개발에서 진짜로 해 보려면 DOMAINS_REAL_DNS=1.
export function getDnsClient(): DnsClient {
  const real = process.env.NODE_ENV === 'production' || process.env.DOMAINS_REAL_DNS === '1'
  if (!real) {
    fakeClient ??= createFakeDnsClient()
    return fakeClient
  }
  const token = process.env.CLOUDFLARE_DNS_API_TOKEN
  const zoneId = process.env.CLOUDFLARE_ZONE_ID
  if (!token || !zoneId) throw new DnsError('CLOUDFLARE_DNS_API_TOKEN / CLOUDFLARE_ZONE_ID 가 설정되지 않았어요.')
  return createDnsClient({ token, zoneId })
}
