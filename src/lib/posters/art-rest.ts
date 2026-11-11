// 대곽나루 서버(Node)에서 Workers AI 그림 모델을 부른다 — Worker 의 AI 바인딩 대신(art.ts drawPosterArt).
// 같은 계정·같은 모델이라 하루 무료 한도(10,000 neurons)도 Worker 와 함께 쓴다. 토큰은 Workers AI 권한만(CLOUDFLARE_AI_API_TOKEN).
// 실패는 오류 문구를 던진다 — classifyArtError 가 한도 문구(daily free allocation·429)를 알아본다.

interface AiRestResponse {
  success?: boolean
  result?: { image?: string }
  errors?: { code?: number; message?: string }[]
}

export async function runArtModelRest(model: string, form: FormData, f: typeof fetch = fetch): Promise<{ image?: string }> {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID
  const token = process.env.CLOUDFLARE_AI_API_TOKEN
  if (!account || !token) throw new Error('Workers AI 토큰 없음')
  const res = await f(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = (await res.json().catch(() => ({}))) as AiRestResponse
  if (!res.ok || data.success === false) {
    const messages = (data.errors ?? []).map((e) => `${e.code ?? ''} ${e.message ?? ''}`.trim()).join('; ')
    throw new Error(`Workers AI ${res.status} ${messages}`)
  }
  return { image: data.result?.image }
}
