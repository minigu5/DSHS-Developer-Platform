// 대곽나루 허브(학생 서버 대여) 클라이언트 — 학생 서버에 <이름>.dshs.dev 를 묶는다.
// 허브 쪽 API: GET /devplatform/servers?email= · PUT/DELETE /devplatform/servers/{id}/domain · POST /devplatform/sync
// 모든 요청에 헤더 x-devplatform-key. JSON 은 snake_case 라 여기서 camelCase 로 바꾼다.
// 운영 Worker 비밀 NARU_HUB_URL(https://hub.dshs-app.net)·NARU_HUB_KEY(허브 DEVPLATFORM_API_KEY와 같은 값). 로그에 이메일·키를 찍지 않는다.

export type NaruServer = {
  id: string
  name: string
  status: string
  nodeId: string | null
  domain: string | null
  target: string | null
}

/** 허브가 답한 HTTP 상태. 네트워크 실패·시간 초과는 status 0 */
export class NaruError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'NaruError'
    this.status = status
  }
}

export type NaruBinding = { serverId: string; email: string; name: string }

export type NaruClient = {
  listServers(email: string): Promise<NaruServer[]>
  bind(serverId: string, email: string, name: string): Promise<{ target: string }>
  unbind(serverId: string, email: string): Promise<void>
  sync(bindings: NaruBinding[]): Promise<{ gone: string[] }>
}

type RawServer = {
  id?: unknown
  name?: unknown
  status?: unknown
  node_id?: unknown
  domain?: unknown
  target?: unknown
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

export function createNaruClient(opts: { url: string; key: string; fetch?: typeof fetch }): NaruClient {
  const f = opts.fetch ?? fetch
  const base = opts.url.replace(/\/+$/, '')

  async function call(method: string, path: string, body?: unknown): Promise<unknown> {
    let res: Response
    try {
      res = await f(base + path, {
        method,
        headers: { 'x-devplatform-key': opts.key, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      })
    } catch (e) {
      throw new NaruError(e instanceof Error ? e.message : 'network', 0)
    }
    if (!res.ok) throw new NaruError(`naru hub ${res.status}`, res.status)
    if (res.status === 204) return null
    try {
      return await res.json()
    } catch {
      throw new NaruError('naru hub: invalid json', 502)
    }
  }

  return {
    async listServers(email) {
      const data = (await call('GET', `/devplatform/servers?email=${encodeURIComponent(email)}`)) as { servers?: RawServer[] } | null
      if (!data || !Array.isArray(data.servers)) throw new NaruError('naru hub: bad servers response', 502)
      return data.servers.flatMap((s) => {
        const id = str(s.id)
        if (!id) return []
        return [{ id, name: str(s.name) ?? '', status: str(s.status) ?? '', nodeId: str(s.node_id), domain: str(s.domain), target: str(s.target) }]
      })
    },

    async bind(serverId, email, name) {
      const data = (await call('PUT', `/devplatform/servers/${encodeURIComponent(serverId)}/domain`, { email, name })) as { target?: unknown } | null
      const target = str(data?.target)
      if (!target) throw new NaruError('naru hub: no target', 502)
      return { target }
    },

    async unbind(serverId, email) {
      await call('DELETE', `/devplatform/servers/${encodeURIComponent(serverId)}/domain?email=${encodeURIComponent(email)}`)
    },

    async sync(bindings) {
      const data = (await call('POST', '/devplatform/sync', {
        bindings: bindings.map((b) => ({ server_id: b.serverId, email: b.email, name: b.name })),
      })) as { gone?: unknown } | null
      if (!data || !Array.isArray(data.gone)) throw new NaruError('naru hub: bad sync response', 502)
      return { gone: data.gone.filter((g): g is string => typeof g === 'string') }
    },
  }
}

// 개발(next dev)에서 쓰는 메모리 가짜 — 진짜 허브를 부르지 않는다. 서버 하나가 있다
function createFakeNaruClient(): NaruClient {
  const TARGET = '00000000-0000-0000-0000-000000000000.cfargotunnel.com'
  const servers: NaruServer[] = [{ id: 'fa4e0001', name: '시험 서버', status: 'running', nodeId: null, domain: null, target: TARGET }]
  return {
    async listServers(email) {
      console.log('[naru:fake] listServers')
      void email
      return servers.map((s) => ({ ...s }))
    },
    async bind(serverId, _email, name) {
      const s = servers.find((x) => x.id === serverId)
      if (!s) throw new NaruError('not found', 404)
      for (const o of servers) if (o.domain === name) o.domain = null
      s.domain = name
      console.log(`[naru:fake] bind ${serverId} -> ${name}`)
      return { target: s.target ?? TARGET }
    },
    async unbind(serverId) {
      const s = servers.find((x) => x.id === serverId)
      if (s) s.domain = null
      console.log(`[naru:fake] unbind ${serverId}`)
    },
    async sync(bindings) {
      const gone = bindings.filter((b) => !servers.some((s) => s.id === b.serverId)).map((b) => b.serverId)
      console.log(`[naru:fake] sync ${bindings.length} (gone ${gone.length})`)
      return { gone }
    },
  }
}

let fakeClient: NaruClient | undefined

/**
 * 운영: NARU_HUB_URL·NARU_HUB_KEY 가 있으면 진짜 허브, 없으면 null("준비 중").
 * 개발(next dev): 값이 있어도 가짜 — 실수로 운영 허브를 바꾸지 않게. 진짜로 해 보려면 NARU_REAL=1 (DOMAINS_REAL_DNS 와 같은 방식).
 */
export function getNaruClient(): NaruClient | null {
  const real = process.env.NODE_ENV === 'production' || process.env.NARU_REAL === '1'
  if (!real) {
    fakeClient ??= createFakeNaruClient()
    return fakeClient
  }
  const url = process.env.NARU_HUB_URL
  const key = process.env.NARU_HUB_KEY
  if (!url || !key) return null
  return createNaruClient({ url, key })
}

/** 대곽나루 서버 탭 — 서버 id 는 붙이지 않는다(탭에서 고른다) */
export function naruLinkFor(serverId: string): string {
  void serverId
  return 'https://대곽나루.dshs-app.net/dashboard?view=server'
}

/**
 * 주소를 반납한 뒤 허브 묶음을 푼다 — 최선 노력. 실패해도 반납은 성공으로 보고(매일 점검의 sync 가 정리) 로그만 남긴다.
 * 대곽나루 행이 아니거나 서버 id·주인 이메일을 모르거나 허브 클라이언트가 없으면 아무것도 안 한다. 로그에 이메일을 찍지 않는다.
 */
export async function unbindNaruBestEffort(
  naru: Pick<NaruClient, 'unbind'> | null,
  row: { host: string | null; naruServerId: string | null; ownerEmail: string | null },
  log: (message: string, detail?: unknown) => void = (m, d) => console.error(m, d),
): Promise<void> {
  if (row.host !== 'naru' || !row.naruServerId) return
  if (!naru || !row.ownerEmail) {
    log('[naru] 허브 묶음 풀기를 건너뜀(허브 설정 또는 주인 이메일 없음), 매일 점검이 정리')
    return
  }
  try {
    await naru.unbind(row.naruServerId, row.ownerEmail)
  } catch (e) {
    log('[naru] 허브 묶음 풀기 실패, 매일 점검이 정리', e instanceof NaruError ? `status ${e.status}` : 'error')
  }
}
