// 연결하기의 핵심 순서: Cloudflare 레코드 생성 → DB 기록. DB 기록이 실패하면 방금 만든 레코드를 지운다
// (안 지우면 DB 가 모르는 레코드가 남는다 — 남더라도 매일 점검이 comment 로 찾아 정리한다).

import type { DnsClient, DnsRecordInput } from './cloudflare.ts'
import type { TxtInput } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'

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
