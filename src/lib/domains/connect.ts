// 연결하기의 핵심 순서: Cloudflare 레코드 생성 → DB 기록. DB 기록이 실패하면 방금 만든 레코드를 지운다
// (안 지우면 DB 가 모르는 레코드가 남는다 — 남더라도 매일 점검이 comment 로 찾아 정리한다).

import type { DnsClient, DnsRecordInput } from './cloudflare.ts'
import type { TxtInput } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'
import type { NaruClient } from './naru.ts'

export function buildRecords(name: string, target: string, txt: TxtInput[]): DnsRecordInput[] {
  return [
    { type: 'CNAME', name: `${name}.${ROOT_DOMAIN}`, content: target },
    ...txt.map((t): DnsRecordInput => ({ type: 'TXT', name: t.name, content: t.value })),
  ]
}

export async function runConnect(
  deps: { dns: DnsClient; rpcConnect: (ids: string[]) => Promise<void> },
  rows: DnsRecordInput[],
  rowId: string,
): Promise<void> {
  const ids = await deps.dns.create(rows, rowId)
  try {
    await deps.rpcConnect(ids)
  } catch (e) {
    await deps.dns.remove(ids).catch(() => {})
    throw e
  }
}

/**
 * 대곽나루 서버에 연결: 허브 묶기 → 허브가 준 target 으로 proxied CNAME → DB 기록.
 * 허브 묶기가 실패하면 DNS 를 하나도 만들지 않는다. DNS 가 실패하면 허브 묶음을 풀고,
 * DB 기록이 실패하면 DNS 를 지우고 허브 묶음을 푼 뒤 원래 오류를 그대로 던진다(풀기·지우기 실패는 무시 — 매일 점검이 정리).
 * clearOld: 허브 묶기가 성공한 뒤 DNS 를 만들기 전에 옛 레코드(자리표시 등)를 지우는 단계. rpcConnect 는 target 도 받는다.
 */
export async function runConnectNaru(
  deps: {
    naru: Pick<NaruClient, 'bind' | 'unbind'>
    dns: DnsClient
    rpcConnect: (ids: string[], target: string) => Promise<void>
    clearOld?: () => Promise<void>
  },
  input: { id: string; name: string; serverId: string; email: string },
): Promise<void> {
  const { target } = await deps.naru.bind(input.serverId, input.email, input.name)
  const unbind = () => deps.naru.unbind(input.serverId, input.email).catch(() => {})

  let ids: string[]
  try {
    await deps.clearOld?.()
    ids = await deps.dns.create(
      [{ type: 'CNAME', name: `${input.name}.${ROOT_DOMAIN}`, content: target, proxied: true }],
      input.id,
    )
  } catch (e) {
    await unbind()
    throw e
  }
  try {
    await deps.rpcConnect(ids, target)
  } catch (e) {
    await deps.dns.remove(ids).catch(() => {})
    await unbind()
    throw e
  }
}
