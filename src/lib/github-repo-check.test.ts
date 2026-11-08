import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkGithubRepo, repoStatusFromApi, repoStatusFromPage } from './github-repo-check.ts'

const repo = { owner: 'octo', repo: 'demo' }

function fakeFetch(responses: Record<string, { status: number; body?: unknown } | Error>) {
  const calls: string[] = []
  const impl = (async (input: string | URL | Request) => {
    const url = String(input)
    calls.push(url)
    const r = responses[url]
    if (!r) throw new Error(`예상 못 한 요청 ${url}`)
    if (r instanceof Error) throw r
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status })
  }) as typeof fetch
  return { impl, calls }
}

const API = 'https://api.github.com/repos/octo/demo'
const PAGE = 'https://github.com/octo/demo'

test('API 판정: 공개 200 / 비공개·없음 404 / 그 밖은 모름', () => {
  assert.equal(repoStatusFromApi(200, { private: false }), 'public')
  assert.equal(repoStatusFromApi(200, { private: true }), 'missing')
  assert.equal(repoStatusFromApi(404, null), 'missing')
  assert.equal(repoStatusFromApi(451, null), 'missing')
  assert.equal(repoStatusFromApi(403, null), 'unknown')
  assert.equal(repoStatusFromApi(500, null), 'unknown')
  assert.equal(repoStatusFromApi(200, null), 'unknown')
})

test('웹 페이지 판정', () => {
  assert.equal(repoStatusFromPage(200), 'public')
  assert.equal(repoStatusFromPage(404), 'missing')
  assert.equal(repoStatusFromPage(429), 'unknown')
})

test('API가 404면 웹 페이지는 안 본다', async () => {
  const { impl, calls } = fakeFetch({ [API]: { status: 404, body: { message: 'Not Found' } } })
  assert.equal(await checkGithubRepo(repo, { fetchImpl: impl }), 'missing')
  assert.deepEqual(calls, [API])
})

test('API가 공개면 public', async () => {
  const { impl } = fakeFetch({ [API]: { status: 200, body: { private: false } } })
  assert.equal(await checkGithubRepo(repo, { fetchImpl: impl }), 'public')
})

test('API 한도에 걸리면 웹 페이지로 판정', async () => {
  const limited = fakeFetch({ [API]: { status: 403 }, [PAGE]: { status: 404 } })
  assert.equal(await checkGithubRepo(repo, { fetchImpl: limited.impl }), 'missing')
  assert.deepEqual(limited.calls, [API, PAGE])

  const pub = fakeFetch({ [API]: { status: 429 }, [PAGE]: { status: 200 } })
  assert.equal(await checkGithubRepo(repo, { fetchImpl: pub.impl }), 'public')
})

test('둘 다 실패하면 unknown — 막거나 바꾸지 않는다', async () => {
  const { impl } = fakeFetch({ [API]: new Error('network'), [PAGE]: { status: 503 } })
  assert.equal(await checkGithubRepo(repo, { fetchImpl: impl }), 'unknown')
})
