// 대곽나루 허브(학생 서버 대여) 클라이언트 — 학생 서버에 <이름>.dshs.dev 를 묶는다.
// 허브 쪽 API: GET /devplatform/servers?email= · PUT/DELETE /devplatform/servers/{id}/domain · POST /devplatform/sync
// 모든 요청에 헤더 x-devplatform-key. JSON 은 snake_case 라 여기서 camelCase 로 바꾼다.
// 운영 Worker 비밀 NARU_HUB_URL(https://hub.dshs-app.net)·NARU_HUB_KEY(허브 DEVPLATFORM_API_KEY와 같은 값). 로그에 이메일·키를 찍지 않는다.

import { RECORD_COMMENT_PREFIX, type DnsClient } from './cloudflare.ts'
import { isNaruHost } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'

export type NaruServer = {
  id: string
  name: string
  status: string
  nodeId: string | null
  domain: string | null
  target: string | null
  /** 화면용: 주소를 붙일 수 있는가(허브가 터널 대상을 줬는가). 클라이언트는 이 값을 채우지 않는다 — listMyNaruServers 가 채운다 */
  ready?: boolean
}

/** 화면에 넘길 서버 목록: running·stopped 만, 허브 내부 값(노드·터널 대상)은 지우고 target 이 없으면 ready=false */
export function toPickableServers(servers: NaruServer[]): NaruServer[] {
  return servers
    .filter((s) => s.status === 'running' || s.status === 'stopped')
    .map((s) => ({ ...s, nodeId: null, target: null, ready: s.target !== null }))
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

// ── 매일 점검: 대곽나루 행은 토큰 확인 대신 허브와 맞춘다 (scripts/check-subdomains.mts)

export type NaruRow = {
  id: string
  naruServerId: string
  ownerEmail: string
  name: string
  /** 있으면 대곽나루·살아 있는 행만 묶음에 넣는다(조회가 이미 거르면 생략) */
  host?: string | null
  status?: string
}

const LIVE_STATUSES = ['reserved', 'pending', 'active', 'broken']

/** 허브에 보낼 묶음 — live 대곽나루 행만 */
export function planNaruSync(rows: NaruRow[]): NaruBinding[] {
  return rows
    .filter((r) => (r.host === undefined || r.host === 'naru') && (r.status === undefined || LIVE_STATUSES.includes(r.status)))
    .map((r) => ({ serverId: r.naruServerId, email: r.ownerEmail, name: r.name }))
}

/** 허브가 "그 서버가 없다(또는 주인이 다르다)"고 한 행 id — 반납할 행 */
export function naruReleases(rows: { id: string; naruServerId: string }[], gone: string[]): string[] {
  const set = new Set(gone)
  return rows.filter((r) => set.has(r.naruServerId)).map((r) => r.id)
}

/** 한 번에 이보다 많이(그리고 전체의 절반 넘게) 반납해야 하면 허브 이상으로 보고 멈춘다 */
export const NARU_MASS_RELEASE_MIN = 2

export type NaruSyncDeps = {
  /** null = 허브 설정(NARU_HUB_URL·KEY) 없음 */
  naru: Pick<NaruClient, 'sync'> | null
  /** 대곽나루 행 조회. 실패하면 던진다 — 그러면 sync 를 부르지 않는다(빈 목록으로 허브의 묶음이 다 지워지지 않게) */
  loadRows: () => Promise<NaruRow[]>
  /** DB 반납 + DNS 삭제. 실패하면 던진다 */
  release: (row: NaruRow) => Promise<void>
  dryRun: boolean
  /** 공개 로그 — 주소 이름만 찍는다(이메일·서버 id 금지) */
  log: (message: string) => void
}

/**
 * 대곽나루 행을 허브와 맞춘다: 조회 → sync → gone 행 반납.
 * - 조회 실패: sync 를 안 부르고 실패 1건
 * - 허브가 안 닿음(네트워크·5xx): 반납 없이 건너뜀(실패 아님 — 허브 장애로 학생 주소를 잃지 않게)
 * - 허브가 거절(401 등): 설정 문제라 실패
 * - dry-run: 허브를 부르지 않고 계획만 출력
 */
export async function runNaruSync(deps: NaruSyncDeps): Promise<{ failures: number; released: string[] }> {
  let rows: NaruRow[]
  try {
    rows = await deps.loadRows()
  } catch (e) {
    deps.log(`❌  대곽나루 주소 조회 실패, 허브와 맞추지 않음: ${e instanceof Error ? e.message : String(e)}`)
    return { failures: 1, released: [] }
  }

  if (deps.dryRun) {
    deps.log(`대곽나루 주소 ${rows.length}개: ${rows.map((r) => r.name).join(', ') || '(없음)'} — dry-run 이라 허브와 맞추지 않아요`)
    return { failures: 0, released: [] }
  }
  if (!deps.naru) {
    if (!rows.length) return { failures: 0, released: [] }
    deps.log('❌  NARU_HUB_URL / NARU_HUB_KEY 가 없어 대곽나루 주소를 허브와 맞추지 못해요')
    return { failures: 1, released: [] }
  }

  let gone: string[]
  try {
    gone = (await deps.naru.sync(planNaruSync(rows))).gone
  } catch (e) {
    if (e instanceof NaruError && (e.status === 0 || e.status >= 500)) {
      deps.log(`  ⚠️  대곽나루 허브에 닿지 못해 이번엔 건너뜀(status ${e.status}) — 주소는 그대로 둠`)
      return { failures: 0, released: [] }
    }
    deps.log(`❌  대곽나루 허브 sync 실패: ${e instanceof NaruError ? `status ${e.status}` : String(e)}`)
    return { failures: 1, released: [] }
  }

  // 허브 캐시가 비정상(서버 목록 유실 등)이면 거의 모든 묶음이 gone 으로 온다. 한꺼번에 많이 반납하기 전에 멈춘다 — 이메일은 찍지 않는다.
  // 비율의 분모는 읽은 전체가 아니라 실제로 허브에 보낸 묶음 수다(보내지 않은 행이 섞여도 기준이 흐려지지 않게).
  const sent = rows.filter((r) => planNaruSync([r]).length > 0)
  if (gone.length > NARU_MASS_RELEASE_MIN && gone.length * 2 > sent.length) {
    const goneIds = new Set(gone)
    const names = sent.filter((r) => goneIds.has(r.naruServerId)).map((r) => r.name)
    deps.log(
      `❌  허브가 ${sent.length}개 중 ${gone.length}개를 '서버 없음'이라고 해 반납하지 않고 멈춤(허브 서버 목록 이상 의심): ${names.join(', ') || '(이름 없음)'}`,
    )
    return { failures: 1, released: [] }
  }

  let failures = 0
  const released: string[] = []
  const byId = new Map(sent.map((r) => [r.id, r]))
  for (const id of naruReleases(sent, gone)) {
    const row = byId.get(id)!
    try {
      await deps.release(row)
      released.push(row.name)
      deps.log(`  ${row.name}.dshs.dev: 대곽나루 서버가 없어 반납(naru_server_gone)`)
    } catch (e) {
      failures++
      deps.log(`  ❌  ${row.name}.dshs.dev: 반납 실패 ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  deps.log(`  대곽나루 주소 ${sent.length}개를 허브와 맞춤${released.length ? `, ${released.length}개 반납` : ''}`)
  return { failures, released }
}

// ── 확인(verifySubdomain)을 건너뛸지

/** ② 내 사이트 원래 주소를 저장했고 아직 확인 전인 행 — 이 단계의 확인은 원래 주소에서 한다 */
export function isSiteStep(row: { site_url: string | null; site_host: string | null; site_verified_at: string | null }): boolean {
  return !row.site_verified_at && Boolean(row.site_url) && Boolean(row.site_host)
}

/**
 * 대곽나루 서버 주소는 확인 코드도 연결 확인도 없다 — 연결하는 순간 active, 반납은 허브에 서버가 없을 때만.
 * 단 다른 호스트로 옮기려고 ② 원래 주소를 확인하는 중(isSiteStep)이면 그대로 확인해야 connectHost 가 not_verified 로 막히지 않는다.
 */
export function shouldSkipVerify(row: {
  host: string | null
  site_url: string | null
  site_host: string | null
  site_verified_at: string | null
}): boolean {
  return isNaruHost(row.host) && !isSiteStep(row)
}

// ── 매일 점검: 대곽나루 행의 DNS 레코드가 없으면 다시 만든다 (같은 서버 재연결이 중간에 실패하면 옛 레코드만 지워진 active 행이 남는다)

export type NaruDnsRow = { id: string; name: string; target: string | null }

/**
 * 대곽나루 행의 proxied CNAME 을 target 으로 (다시) 만들고 레코드 id 를 DB 에 기록한다. 매일 점검(runNaruDnsRepair)과
 * 다른 호스트로 옮기는 연결이 실패했을 때의 즉시 복구(actions.ts connectHost)가 같이 쓴다.
 * 연결 대상을 모르면 만들지 않고 던진다. DB 기록이 실패하면 방금 만든 레코드를 지우고 오류를 그대로 던진다.
 */
export async function restoreNaruDns(
  deps: { dns: Pick<DnsClient, 'create' | 'remove'>; setRecords: (rowId: string, recordIds: string[]) => Promise<void> },
  row: NaruDnsRow,
): Promise<void> {
  if (!row.target) throw new Error('연결 대상(target)을 몰라 DNS 레코드를 만들지 못함')
  const ids = await deps.dns.create([{ type: 'CNAME', name: `${row.name}.${ROOT_DOMAIN}`, content: row.target, proxied: true }], row.id)
  try {
    await deps.setRecords(row.id, ids)
  } catch (e) {
    await deps.dns.remove(ids).catch(() => {})
    throw e
  }
}

export type NaruDnsRepairDeps = {
  /** 살아 있는 대곽나루 행. 실패하면 던진다 */
  loadRows: () => Promise<NaruDnsRow[]>
  /** listManaged: 댓글 `dshs-subdomain:<행 id>` 가 붙은 레코드(우리가 만든 것)를 모은다 */
  dns: Pick<DnsClient, 'create' | 'remove' | 'listManaged'>
  /** DB 에 새 레코드 id 를 기록한다(subdomain_set_naru_records). 실패하면 던진다 */
  setRecords: (rowId: string, recordIds: string[]) => Promise<void>
  dryRun: boolean
  /** 공개 로그 — 주소 이름만 찍는다(이메일·서버 id·터널 대상 금지) */
  log: (message: string) => void
}

/**
 * 살아 있는 대곽나루 행마다 Cloudflare 에 그 행의 레코드(댓글 `dshs-subdomain:<행 id>`)가 있는지 보고,
 * 없으면 proxied CNAME 을 target 으로 다시 만들어 레코드 id 를 DB 에 기록한다.
 * 행·목록 조회가 실패하면 아무것도 만들지 않고 실패 1건. DB 기록이 실패하면 방금 만든 레코드를 지운다.
 */
export async function runNaruDnsRepair(deps: NaruDnsRepairDeps): Promise<{ failures: number; recreated: string[] }> {
  let rows: NaruDnsRow[]
  try {
    rows = await deps.loadRows()
  } catch (e) {
    deps.log(`❌  대곽나루 DNS 점검: 주소 조회 실패 ${e instanceof Error ? e.message : String(e)}`)
    return { failures: 1, recreated: [] }
  }
  if (!rows.length) return { failures: 0, recreated: [] }

  let have: Set<string>
  try {
    have = new Set((await deps.dns.listManaged()).map((m) => m.comment))
  } catch (e) {
    deps.log(`❌  대곽나루 DNS 점검: Cloudflare 레코드 조회 실패 ${e instanceof Error ? e.message : String(e)}`)
    return { failures: 1, recreated: [] }
  }

  let failures = 0
  const recreated: string[] = []
  for (const row of rows) {
    if (have.has(RECORD_COMMENT_PREFIX + row.id)) continue
    const fqdn = `${row.name}.${ROOT_DOMAIN}`
    if (!row.target) {
      failures++
      deps.log(`  ❌  ${fqdn}: DNS 레코드가 없는데 연결 대상을 몰라 다시 만들지 못함`)
      continue
    }
    if (deps.dryRun) {
      deps.log(`  ${fqdn}: DNS 레코드가 없어 다시 만들 예정 (dry-run, 그대로 둠)`)
      continue
    }
    try {
      await restoreNaruDns(deps, row)
      recreated.push(row.name)
      deps.log(`  ${fqdn}: DNS 레코드가 없어 다시 만듦`)
    } catch (e) {
      failures++
      deps.log(`  ❌  ${fqdn}: DNS 레코드 다시 만들기 실패 ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { failures, recreated }
}
