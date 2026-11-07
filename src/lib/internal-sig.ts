// Worker 진입점(custom-worker.ts, Next 밖)이 같은 Worker 의 내부 경로를 부를 때 쓰는 서명 — 키 = 서비스 키라 새 비밀값이 없다.
// 브라우저·학생 사이트는 서비스 키를 모르니 서명을 만들 수 없다. Node·Workers 공통이라 '@/' 경로·server-only 를 import 하지 않는다.

const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')

/** message 의 HMAC-SHA256(hex 64자) */
export async function signInternal(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)))
}

export async function verifyInternal(message: string, sig: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret || !sig || sig.length !== 64) return false
  const expected = await signInternal(message, secret)
  // 길이가 같으니 글자마다 비교(시간 차로 맞춰 보기 방지)
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}
