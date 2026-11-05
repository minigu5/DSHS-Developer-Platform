import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dshsNameOf, visitUrlFor } from './visit-url.ts'

test('dshs.dev 바로 아래 이름만 잡는다', () => {
  assert.equal(dshsNameOf('https://meal.dshs.dev'), 'meal')
  assert.equal(dshsNameOf('https://meal.dshs.dev/menu?x=1'), 'meal')
  assert.equal(dshsNameOf('https://a.meal.dshs.dev'), null)
  assert.equal(dshsNameOf('https://dshs.dev'), null)
  assert.equal(dshsNameOf('https://meal.vercel.app'), null)
  assert.equal(dshsNameOf('https://meal.dshs.dev.evil.com'), null)
})

const row = (status: string, previous_url: string | null, site_url: string | null) => ({ status, previous_url, site_url })

test('연결됐거나 주소 기록이 없으면 방문 주소 그대로', () => {
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('active', 'https://meal.vercel.app', null)), 'https://meal.dshs.dev')
  assert.equal(visitUrlFor('https://meal.dshs.dev', null), 'https://meal.dshs.dev')
})

test('설정 중·끊김이면 바꾸기 전 주소, 없으면 원래 사이트 주소로', () => {
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('pending', 'https://meal.vercel.app/', 'https://x.vercel.app')), 'https://meal.vercel.app/')
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('reserved', null, 'https://meal.web.app')), 'https://meal.web.app')
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('broken', '', 'https://meal.web.app')), 'https://meal.web.app')
})

test('되돌아갈 주소가 없거나 이상하면 방문 주소 그대로', () => {
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('reserved', null, null)), 'https://meal.dshs.dev')
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('reserved', 'javascript:alert(1)', null)), 'https://meal.dshs.dev')
  assert.equal(visitUrlFor('https://meal.dshs.dev', row('reserved', 'https://other.dshs.dev', null)), 'https://meal.dshs.dev')
})
