import { policyVersion } from './format.ts'
import { PRIVACY_EFFECTIVE_DATE, PRIVACY_POLICY_MD } from './policy.ts'

/**
 * 현재 처리방침 버전(시행일 + 본문 해시). 본문(policy.ts)을 고치면 자동으로 바뀐다.
 * 본문 문자열이 딸려 오므로 서버 코드(미들웨어·서버 액션·서버 컴포넌트)에서만 import 하고,
 * 클라이언트 컴포넌트에는 prop 으로 넘길 것.
 */
export const PRIVACY_POLICY_VERSION = policyVersion(PRIVACY_EFFECTIVE_DATE, PRIVACY_POLICY_MD)
