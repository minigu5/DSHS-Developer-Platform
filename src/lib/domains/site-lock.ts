// ② "내 사이트 원래 주소"는 프로젝트 방문 주소로 정한다(2026-11-07 사용자 요청 — 도메인 화면에서 아무 사이트나 적어
// 프로젝트와 다른 사이트에 주소를 붙일 수 있었음). 다른 사이트에 붙이려면 프로젝트 수정에서 방문 주소부터 바꾼다.
// 예외: 방문 주소가 이미 이 주소(<이름>.dshs.dev)면("바꾸기" 뒤 다시 확인, 대곽나루에서 옮기기) 방문 주소로는
// 원래 사이트를 알 수 없어서 직접 적는다.

import { dshsAddressOf, siteAddressFor, type HostKey } from './hosts.ts'
import { ROOT_DOMAIN } from './name.ts'

export type SiteLock =
  | { kind: 'project'; url: string; host: HostKey } // 방문 주소 그대로만
  | { kind: 'free' } // 직접 적기
  | { kind: 'fix_project' } // 방문 주소가 호스트 기본 주소가 아니라 먼저 고쳐야 함

export function siteLockOf(projectUrl: string | null, name: string): SiteLock {
  const url = projectUrl?.trim() ?? ''
  if (url && dshsAddressOf(url) === `${name}.${ROOT_DOMAIN}`) return { kind: 'free' }
  const site = url ? siteAddressFor(url) : null
  return site ? { kind: 'project', url: site.url, host: site.host } : { kind: 'fix_project' }
}

export const SITE_LOCK_ERRORS = {
  fix_project: '프로젝트 방문 주소가 호스트가 준 주소(예: 이름.vercel.app)여야 확인할 수 있어요. 프로젝트 수정에서 방문 주소를 먼저 바꿔 주세요.',
  mismatch: '프로젝트 방문 주소와 같은 사이트만 확인할 수 있어요. 다른 사이트에 붙이려면 프로젝트 수정에서 방문 주소를 먼저 바꿔 주세요.',
} as const
