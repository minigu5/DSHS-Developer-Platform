// 소유 확인용 실제 요청(verify.ts 의 Fetcher). 연결 확인 서버 액션과 매일 점검 스크립트가 같이 쓴다.
// 리다이렉트는 직접 판단하도록(같은 호스트만) 따라가지 않고, 본문은 앞 256KB 만 읽는다.

import type { Fetcher } from './verify.ts'

export const MAX_BODY_BYTES = 256 * 1024
const TIMEOUT_MS = 10_000

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_BODY_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
  }
  await reader.cancel().catch(() => {})
  const all = new Uint8Array(Math.min(size, MAX_BODY_BYTES))
  let off = 0
  for (const c of chunks) {
    const part = c.subarray(0, all.length - off)
    all.set(part, off)
    off += part.length
    if (off >= all.length) break
  }
  return new TextDecoder().decode(all)
}

export function createSiteFetcher(f: typeof fetch = fetch): Fetcher {
  return async (url) => {
    const res = await f(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'dshs-dev-domain-check/1.0 (+https://dshs.dev/domains)', Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return { status: res.status, headers: res.headers, body: await readCapped(res), location: res.headers.get('location') }
  }
}
