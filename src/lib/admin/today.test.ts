import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTodayItems, type FeedItem } from './today.ts'

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  kind: 'tip_comment',
  id: 'c1',
  createdAt: '2026-11-05T01:00:00Z',
  authorName: '민규',
  anonymous: false,
  title: null,
  body: '좋은 글이에요',
  href: '/tips/t1',
  ...over,
})

const empty = { feed: [], bursts: [], guideShrinks: [], brokenDomains: [], endedBans: [], dismissed: new Set<string>() }

test('비속어가 든 글만 고른다', () => {
  const out = buildTodayItems({ ...empty, feed: [item({ id: 'bad', body: '이거 시발 뭐야' }), item({ id: 'ok' })] })
  assert.equal(out.length, 1)
  assert.equal(out[0].kind, 'profanity')
  assert.equal(out[0].target.id, 'bad')
  assert.equal(out[0].key, 'profanity:bad')
  assert.equal(out[0].reason, '비속어가 있어요')
})

test('제목에 든 비속어도 고른다', () => {
  const out = buildTodayItems({ ...empty, feed: [item({ kind: 'project', id: 'p', title: '병신 앱', body: '' })] })
  assert.equal(out.length, 1)
})

test('확인함으로 넘긴 것은 뺀다', () => {
  const out = buildTodayItems({ ...empty, feed: [item({ id: 'bad', body: '시발' })], dismissed: new Set(['profanity:bad']) })
  assert.equal(out.length, 0)
})

test('종류 순서: 비속어 → 몰아 올리기 → 위키 삭제 → 끊긴 주소 → 끝난 차단', () => {
  const burstItems = [item({ id: 'b1' }), item({ id: 'b2' }), item({ id: 'b3' })]
  const out = buildTodayItems({
    feed: [item({ id: 'bad', body: '시발' })],
    bursts: [{ kind: 'tip_comment', authorKey: 'k1', anonymous: false, items: burstItems }],
    guideShrinks: [{ revId: 'r1', docKey: 'agent-claude', docTitle: 'Claude', minus: 900, plus: 100, createdAt: '2026-11-05T00:00:00Z' }],
    brokenDomains: [{ id: 'd1', name: 'omm', brokenSince: '2026-11-04T00:00:00Z' }],
    endedBans: [{ banId: 'x1', name: '민규', anonymous: false, until: '2026-11-04T00:00:00Z' }],
    dismissed: new Set(),
  })
  assert.deepEqual(out.map((t) => t.kind), ['profanity', 'burst', 'guide_shrink', 'broken_domain', 'ban_ended'])
  assert.equal(out[1].reason, '10분 안에 3개를 올렸어요')
  assert.equal(out[2].reason, '한 번에 800자를 지웠어요')
  assert.equal(out[3].reason, '주소가 끊겼어요')
  assert.equal(out[4].reason, '차단이 끝났어요')
})

test('익명 묶음은 이름 없이 그대로 둔다', () => {
  const items = [1, 2, 3].map((n) => item({ kind: 'project', id: `p${n}`, anonymous: true, authorName: null }))
  const out = buildTodayItems({ ...empty, bursts: [{ kind: 'project', authorKey: 'k', anonymous: true, items }] })
  assert.ok(out[0].items?.every((i) => i.authorName === null))
})

test('같은 종류 안에서는 최신순', () => {
  const out = buildTodayItems({
    ...empty,
    feed: [item({ id: 'old', body: '시발', createdAt: '2026-11-04T00:00:00Z' }), item({ id: 'new', body: '시발', createdAt: '2026-11-05T00:00:00Z' })],
  })
  assert.deepEqual(out.map((t) => t.target.id), ['new', 'old'])
})
