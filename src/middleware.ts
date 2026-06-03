import { NextResponse, type NextRequest } from 'next/server';

import { isAllowedEmail } from '@/lib/constants';
import { updateSession } from '@/lib/supabase/middleware';

// 로그인이 강제되는 경로 prefix. 메인/탐색/상세는 비로그인도 열람 가능.
const PROTECTED_PREFIXES = ['/projects/new', '/me'] as const;

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
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;

  // 1차: 로그인은 됐지만 허용되지 않은 도메인 → 강제 로그아웃 + forbidden 페이지
  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/auth/forbidden';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 2차: 보호 라우트인데 비로그인 → /login 으로 (원래 가려던 경로 보존)
  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 3차: 이미 로그인 됐는데 /login 접근 → 홈으로
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 4차: 로그인 됐고 닉네임이 없는데 /onboarding이 아닌 곳에 있으면 → /onboarding으로
  // 단, auth 관련 경로나 정적 파일은 제외 (이미 matcher에서 어느 정도 걸러짐)
  if (user && !pathname.startsWith('/onboarding') && !pathname.startsWith('/auth') && !pathname.startsWith('/login')) {
    const { data: profile } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', user.id)
      .single();

    if (!profile?.nickname) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
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
