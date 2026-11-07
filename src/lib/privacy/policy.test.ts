import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PRIVACY_POLICY_MD } from './policy.ts'

test('Gemini 문단: 프로젝트 이름은 보내고 학생 이름은 안 보낸다는 게 헷갈리지 않게', () => {
  assert.match(PRIVACY_POLICY_MD, /학생 이름·이메일·실명·팀원은 보내지 않아요/)
  assert.doesNotMatch(PRIVACY_POLICY_MD, /[^생] 이름·이메일·실명·팀원은 보내지 않아요/)
})
