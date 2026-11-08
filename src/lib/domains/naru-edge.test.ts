import { test } from 'node:test'
import assert from 'node:assert/strict'
import { edgeNotice, parseEdge, CONNECT_NOTE, SEOUL_WHY } from './naru-edge.ts'

test('parseEdge 는 아는 값만 남긴다', () => {
  assert.equal(parseEdge('seoul'), 'seoul')
  assert.equal(parseEdge('nope'), null)
  assert.equal(parseEdge(null), null)
})

test('문구는 승인된 그대로', () => {
  assert.equal(edgeNotice('pending')?.label, '서울 입구 준비 중(약 1~2분)')
  assert.equal(edgeNotice('queued')?.label, '서울 입구 준비 중(약 1~2분)')
  assert.equal(edgeNotice('seoul')?.label, '연결됨 · 서울 입구')
  assert.equal(edgeNotice('seoul')?.detail, SEOUL_WHY)
  assert.equal(edgeNotice('spare')?.label, '지금은 예비 길(미국 경유)로 열려요')
  assert.match(edgeNotice('spare')!.detail, /새벽에 자동으로/)
  assert.match(edgeNotice('spare_quota')!.detail, /오늘 학생 사이트 전체 요청이 많아서/)
  assert.match(edgeNotice('spare_quota')!.detail, /오전 9시 이후/)
  assert.equal(edgeNotice(null), null)
  assert.match(CONNECT_NOTE, /1~2분 동안 주소가 안 열릴 수 있어요/)
})
