import { NextResponse, type NextRequest } from 'next/server';

import { isAllowedEmail } from '@/lib/constants';
import { PRIVACY_COOKIE, PRIVACY_COOKIE_OPTIONS } from '@/lib/privacy/config';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy/version';
import { ONBOARDING_COOKIE_NAME, ONBOARDING_COOKIE_SECURE } from '@/lib/supabase/cookie-options';
import { updateSession } from '@/lib/supabase/middleware';

// 로그인이 강제되는 경로 prefix. 메인/탐색/상세는 비로그인도 열람 가능.
const PROTECTED_PREFIXES = ['/projects/new', '/tips/new', '/haejwo/new', '/announcements/new', '/me'] as const;

// 온보딩 완료 여부를 캐시하는 쿠키 이름 (운영은 __Host- 접두사 — cookie-options.ts)
const ONBOARDING_COOKIE = ONBOARDING_COOKIE_NAME;

// /projects/[id]/edit 같은 동적 보호 라우트
function isProtectedRoute(pathname: string): boolean {
  if (
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return true;
  }
  if (/^\/projects\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/tips\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/haejwo\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/announcements\/[^/]+\/edit$/.test(pathname)) return true;
  if (/^\/guide-wiki\/[^/]+\/edit\/?$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Supabase가 supabaseResponse에 기록한 세션 갱신 쿠키를 리다이렉트 응답에도 복사한다.
  // 이를 빠뜨리면 토큰 갱신 결과가 유실되어 배포 직후 로그인이 풀리는 버그가 발생한다.
  function redirectWithSession(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  // 1차: 로그인은 됐지만 허용되지 않은 도메인 → 강제 로그아웃 + forbidden 페이지
  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/auth/forbidden';
    url.search = '';
    return redirectWithSession(url);
  }

  // 2차: 보호 라우트인데 비로그인 → /login 으로 (원래 가려던 경로 보존)
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + request.nextUrl.search);
    return redirectWithSession(url);
  }

  // 3차: 이미 로그인 됐는데 /login 접근 → 홈으로
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return redirectWithSession(url);
  }

  // 처리방침 동의 확인 결과를 쿠키로 캐시. 동의했으면 DB 조회 없이 쿠키만 본다.
  // 동의 전이면 쿠키를 안 심는다 — 팝업(PrivacyGate)은 화면 쪽 몫이라 여기서 막지는 않는다.
  if (user && request.cookies.get(PRIVACY_COOKIE)?.value !== PRIVACY_POLICY_VERSION) {
    const { data: consent } = await supabase
      .from('privacy_consents')
      .select('id')
      .eq('user_id', user.id)
      .eq('policy_version', PRIVACY_POLICY_VERSION)
      .maybeSingle();
    if (consent) {
      supabaseResponse.cookies.set(PRIVACY_COOKIE, PRIVACY_POLICY_VERSION, PRIVACY_COOKIE_OPTIONS);
    }
  }

  // 4차: 로그인 됐고 닉네임이 없는데 /onboarding이 아닌 곳에 있으면 → /onboarding으로
  // 쿠키에 온보딩 완료가 캐시돼 있으면 DB 쿼리 생략 (매 클릭마다 발생하던 왕복 제거)
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth') && !pathname.startsWith('/login')) {
    const isOnboarded = request.cookies.get(ONBOARDING_COOKIE)?.value === '1';

    if (!isOnboarded) {
      const { data: profile } = await supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .single();

      if (!profile?.nickname) {
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return redirectWithSession(url);
      }

      // 닉네임 확인됨 → 이후 요청은 DB 쿼리 없이 쿠키로 처리
      supabaseResponse.cookies.set(ONBOARDING_COOKIE, '1', {
        httpOnly: true,
        sameSite: 'lax',
        secure: ONBOARDING_COOKIE_SECURE,
        maxAge: 60 * 60 * 24 * 30, // 30일
        path: '/',
      });
    }
  }

  return supabaseResponse;
}

export const config = {
  // 정적 자산 / 이미지 / 파비콘은 미들웨어 스킵
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
