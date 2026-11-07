// 전역 메뉴(PageNav·MobileNav)에서 지금 주소에 켜질 칸의 href. 순수 함수 — node:test 로 검증한다.
// 포스터 화면(/projects/<id>/poster…)과 /posters/* 는 "프로젝트 등록"과 묶는다(2026-11-07 사용자 결정).

const POSTER_PAGE = /^\/projects\/[^/]+\/poster(\/|$)/

export function resolveActive(pathname: string): string {
  if (pathname.startsWith('/guide')) return '/guide'
  if (pathname === '/domains' || pathname.startsWith('/domains/')) return '/domains'
  if (pathname.startsWith('/tips') || pathname.startsWith('/haejwo')) return '/tips'
  if (pathname === '/projects/new' || pathname.endsWith('/edit')) return '/projects/new'
  if (POSTER_PAGE.test(pathname) || pathname.startsWith('/posters/')) return '/projects/new'
  if (pathname.startsWith('/explore') || pathname.startsWith('/developers/') || pathname.startsWith('/projects/')) return '/explore'
  return ''
}
