import { NextResponse, type NextRequest } from 'next/server';

import { isAllowedEmail } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

// Supabase Auth 가 Google OAuth 완료 후 호출하는 콜백.
//   1) authorization code → session 교환
//   2) 이메일 도메인 검증 (Google hd 우회를 막는 진짜 방어선)
//   3) 안전한 next 경로로 복귀
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? '/';

  // open redirect 방지
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/forbidden`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
