import { test } from 'node:test'
import assert from 'node:assert/strict'
import { syncReadme, type FetchReadme, type SyncRow } from './readme-sync.ts'

const NOW = new Date('2026-10-24T18:00:00.000Z')
const row: SyncRow = {
  id: 'p1',
  title: '데모',
  repo_url: 'https://github.com/octo/demo',
  description: '# 옛 설명',
  readme_etag: 'W/"old"',
}
const ok = (text: string, etag: string | null = 'W/"new"'): FetchReadme => async () => ({ status: 'ok', text, path: 'README.md', etag })

test('README 가 바뀌었으면 description·etag·시각을 갱신', async () => {
  const out = await syncReadme(row, ok('# 새 설명'), NOW)
  assert.deepEqual(out, {
    kind: 'synced',
    changed: true,
    patch: { description: '# 새 설명', readme_etag: 'W/"new"', readme_synced_at: NOW.toISOString() },
  })
})

test('내용이 같으면 description 은 건드리지 않고 etag 만 갱신', async () => {
  const out = await syncReadme(row, ok('# 옛 설명'), NOW)
  assert.equal(out.kind, 'synced')
  if (out.kind === 'synced') {
    assert.equal(out.changed, false)
    assert.ok(!('description' in out.patch))
    assert.equal(out.patch.readme_etag, 'W/"new"')
  }
})

test('저장된 etag 를 GitHub 요청에 넘긴다', async () => {
  let seen: { owner: string; repo: string; etag: string | null } | null = null
  await syncReadme(row, async (repo, etag) => {
    seen = { ...repo, etag }
    return { status: 'not_modified' }
  }, NOW)
  assert.deepEqual(seen, { owner: 'octo', repo: 'demo', etag: 'W/"old"' })
})

test('304 면 아무것도 안 함', async () => {
  assert.deepEqual(await syncReadme(row, async () => ({ status: 'not_modified' }), NOW), { kind: 'unchanged' })
})

test('빈 README 로 설명을 지우지 않는다', async () => {
  const out = await syncReadme(row, ok('<!-- 주석만 -->\n'), NOW)
  assert.equal(out.kind, 'skipped')
})

test('GitHub 링크가 아니면 요청 없이 건너뜀', async () => {
  let called = false
  const out = await syncReadme({ ...row, repo_url: 'https://gitlab.com/o/r' }, async () => {
    called = true
    return { status: 'error' }
  }, NOW)
  assert.equal(out.kind, 'skipped')
  assert.equal(called, false)
})

test('실패 종류: 없음/오류는 계속, 한도는 중단', async () => {
  assert.deepEqual(await syncReadme(row, async () => ({ status: 'not_found' }), NOW), {
    kind: 'failed', reason: 'README를 찾지 못했어요(비공개이거나 없음)', fatal: false,
  })
  const limited = await syncReadme(row, async () => ({ status: 'rate_limited' }), NOW)
  assert.equal(limited.kind === 'failed' && limited.fatal, true)
  const err = await syncReadme(row, async () => ({ status: 'error' }), NOW)
  assert.equal(err.kind === 'failed' && err.fatal, false)
})

test('마크다운이 아닌 README 는 건너뜀', async () => {
  assert.equal((await syncReadme(row, async () => ({ status: 'unsupported' }), NOW)).kind, 'skipped')
})
