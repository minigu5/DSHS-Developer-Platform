import { test } from 'node:test'
import assert from 'node:assert/strict'
import { clientIpOf, RELAY_IP_HEADER, RELAY_KEY_HEADER } from './client-ip.ts'

const h = (o: Record<string, string>) => new Headers(o)

test('입구 키가 맞으면 입구가 넘긴 사용자 IP 를 쓴다', () => {
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: '203.0.113.7', [RELAY_KEY_HEADER]: 'k1', 'cf-connecting-ip': '104.28.0.1' }), 'k1'), '203.0.113.7')
})

test('키가 틀리거나 없으면 입구 헤더를 무시하고 cf-connecting-ip', () => {
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: '1.2.3.4', [RELAY_KEY_HEADER]: 'wrong', 'cf-connecting-ip': '198.51.100.9' }), 'k1'), '198.51.100.9')
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: '1.2.3.4', 'cf-connecting-ip': '198.51.100.9' }), 'k1'), '198.51.100.9')
})

test('서버에 키가 없으면(Worker) 입구 헤더를 믿지 않는다', () => {
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: '1.2.3.4', [RELAY_KEY_HEADER]: '', 'cf-connecting-ip': '198.51.100.9' }), undefined), '198.51.100.9')
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: '1.2.3.4', [RELAY_KEY_HEADER]: '' }), ''), 'unknown')
})

test('입구가 넘긴 값이 IP 가 아니면 버린다', () => {
  assert.equal(clientIpOf(h({ [RELAY_IP_HEADER]: 'evil, 1.2.3.4', [RELAY_KEY_HEADER]: 'k1', 'cf-connecting-ip': '198.51.100.9' }), 'k1'), '198.51.100.9')
})

test('예전 순서 유지: cf-connecting-ip → x-forwarded-for 첫 값 → x-real-ip → unknown', () => {
  assert.equal(clientIpOf(h({ 'x-forwarded-for': '192.0.2.1, 10.0.0.1' }), undefined), '192.0.2.1')
  assert.equal(clientIpOf(h({ 'x-real-ip': '192.0.2.2' }), undefined), '192.0.2.2')
  assert.equal(clientIpOf(h({}), undefined), 'unknown')
})
