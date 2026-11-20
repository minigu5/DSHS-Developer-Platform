import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PRIVACY_POLICY_MD } from './policy.ts'

test('AI 포스터를 없앤 뒤 Gemini 위탁·AI 그림 문구가 남지 않는다', () => {
  assert.doesNotMatch(PRIVACY_POLICY_MD, /Gemini|AI 포스터|AI가 그린/)
})
