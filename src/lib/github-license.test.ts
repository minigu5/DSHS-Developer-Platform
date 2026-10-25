import { test } from 'node:test'
import assert from 'node:assert/strict'
import { licenseFeaturesFromPermissions, parseRepoLicense } from './github-license.ts'

test('licenseFeaturesFromPermissions: MIT 허용 4개를 칩 값으로 바꾼다', () => {
  assert.deepEqual(
    licenseFeaturesFromPermissions(['commercial-use', 'modifications', 'distribution', 'private-use']),
    ['commercial', 'modify', 'distribute', 'private'],
  )
})

test('licenseFeaturesFromPermissions: 칩이 없는 항목(patent-use)은 무시하고 순서는 칩 순서', () => {
  assert.deepEqual(
    licenseFeaturesFromPermissions(['private-use', 'patent-use', 'distribution']),
    ['distribute', 'private'],
  )
})

test('licenseFeaturesFromPermissions: 배열이 아니거나 문자열이 아니면 빈 배열', () => {
  assert.deepEqual(licenseFeaturesFromPermissions(undefined), [])
  assert.deepEqual(licenseFeaturesFromPermissions('commercial-use'), [])
  assert.deepEqual(licenseFeaturesFromPermissions([1, null, {}]), [])
})

test('parseRepoLicense: 라이선스 키·이름·SPDX 를 뽑는다', () => {
  const body = { license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT', url: 'https://api.github.com/licenses/mit' } }
  assert.deepEqual(parseRepoLicense(body), { key: 'mit', name: 'MIT License', spdxId: 'MIT' })
})

test('parseRepoLicense: GitHub 가 분류하지 못한 라이선스는 null', () => {
  assert.equal(parseRepoLicense({ license: { key: 'other', name: 'Other', spdx_id: 'NOASSERTION' } }), null)
  assert.equal(parseRepoLicense({ license: { key: 'foo', name: 'Foo', spdx_id: 'NOASSERTION' } }), null)
})

test('parseRepoLicense: license 가 없거나 모양이 이상하면 null', () => {
  assert.equal(parseRepoLicense({}), null)
  assert.equal(parseRepoLicense({ license: null }), null)
  assert.equal(parseRepoLicense(null), null)
  assert.equal(parseRepoLicense('mit'), null)
  assert.equal(parseRepoLicense({ license: { key: 'mit' } }), null)
})

test('parseRepoLicense: 경로를 바꿀 수 있는 키는 거절한다', () => {
  assert.equal(parseRepoLicense({ license: { key: '../user', name: 'x', spdx_id: 'X' } }), null)
  assert.equal(parseRepoLicense({ license: { key: 'a/b', name: 'x', spdx_id: 'X' } }), null)
})
