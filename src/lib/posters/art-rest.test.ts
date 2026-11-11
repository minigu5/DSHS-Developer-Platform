import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runArtModelRest } from './art-rest.ts'
import { classifyArtError } from './decide.ts'

process.env.CLOUDFLARE_ACCOUNT_ID = 'acc123'
process.env.CLOUDFLARE_AI_API_TOKEN = 'tok456'

test('Workers AI REST 로 부르고 result.image 를 돌려준다', async () => {
  let seen: { url: string; auth: string | null; body: unknown } | null = null
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, auth: new Headers(init.headers).get('authorization'), body: init.body }
    return Response.json({ success: true, result: { image: 'QUJD' }, errors: [] })
  }) as unknown as typeof fetch
  const form = new FormData()
  form.append('prompt', 'cat')
  const out = await runArtModelRest('@cf/black-forest-labs/flux-2-klein-4b', form, fakeFetch)
  assert.deepEqual(out, { image: 'QUJD' })
  assert.equal(seen!.url, 'https://api.cloudflare.com/client/v4/accounts/acc123/ai/run/@cf/black-forest-labs/flux-2-klein-4b')
  assert.equal(seen!.auth, 'Bearer tok456')
  assert.equal(seen!.body, form)
})

test('하루 한도 오류는 던진 문구로 quota 로 분류된다', async () => {
  const fakeFetch = (async () =>
    Response.json(
      { success: false, errors: [{ code: 4006, message: 'you have used up your daily free allocation of 10,000 neurons' }] },
      { status: 429 },
    )) as unknown as typeof fetch
  await assert.rejects(runArtModelRest('m', new FormData(), fakeFetch), (e: Error) => {
    assert.equal(classifyArtError(String(e)), 'quota')
    return true
  })
})

test('토큰이 없으면 바로 오류', async () => {
  const before = process.env.CLOUDFLARE_AI_API_TOKEN
  delete process.env.CLOUDFLARE_AI_API_TOKEN
  try {
    await assert.rejects(runArtModelRest('m', new FormData(), (async () => Response.json({})) as unknown as typeof fetch))
  } finally {
    process.env.CLOUDFLARE_AI_API_TOKEN = before
  }
})
