import { test } from 'node:test'
import assert from 'node:assert/strict'
import { commentAuthorView, isMyComment, type CommentRowView } from './comments.ts'

const base: CommentRowView = {
  id: 'c1',
  content: '좋아요',
  created_at: '2026-11-05T00:00:00Z',
  is_author: false,
  public_user_id: null,
  user: null,
}
const anonAuthor: CommentRowView = { ...base, is_author: true, public_user_id: null }
const user = { full_name: '신민규', nickname: '민규', avatar_url: null }

test('익명 프로젝트 만든 사람의 댓글은 이름 없이', () => {
  assert.deepEqual(commentAuthorView(anonAuthor), { kind: 'anonymous-author' })
})

test('보이는 사람은 닉네임 → 실명 순서, 만든 사람 표시', () => {
  assert.deepEqual(commentAuthorView({ ...base, is_author: true, public_user_id: 'u1', user }), {
    kind: 'user',
    userId: 'u1',
    name: '민규',
    avatarUrl: null,
    isAuthor: true,
  })
  const v = commentAuthorView({ ...base, public_user_id: 'u2', user: { ...user, nickname: null } })
  assert.equal(v.kind === 'user' && v.name, '신민규')
  const w = commentAuthorView({ ...base, public_user_id: 'u3', user: null })
  assert.equal(w.kind === 'user' && w.name, '알 수 없음')
})

test('작성자도 만든 사람도 아닌데 사람이 없으면 unknown', () => {
  assert.deepEqual(commentAuthorView(base), { kind: 'unknown' })
})

test('내 댓글 판정', () => {
  assert.equal(isMyComment(anonAuthor, 'u1', true), true)
  assert.equal(isMyComment(anonAuthor, 'u1', false), false)
  assert.equal(isMyComment({ ...base, public_user_id: 'u1' }, 'u1', false), true)
  assert.equal(isMyComment({ ...base, public_user_id: 'u2' }, 'u1', true), false)
  assert.equal(isMyComment(base, null, false), false)
  assert.equal(isMyComment(anonAuthor, null, true), false)
})
