import { NextResponse, type NextRequest } from 'next/server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { isAllowedEmail } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

// 이메일과 구글 계정 이름으로 full_name을 파생.
// 학생 이메일 형식: ts250024@ts.hs.kr (25 = 입학연도, 기수 = 입학연도 + 13)
// 학생 이름 형식: 숫자4자리 + (선택적 공백) + 이름
// 두 조건 중 하나라도 맞지 않으면 null 반환 (선생님 등 예외 처리)
function deriveFullName(email: string, googleName: string): string | null {
  const emailMatch = email.match(/^ts(\d{2})\d+@ts\.hs\.kr$/i);
  if (!emailMatch) return null;

  const nameMatch = googleName.match(/^\d{4}\s*(.+)$/);
  if (!nameMatch) return null;

  const generation = parseInt(emailMatch[1], 10) + 13;
  const name = nameMatch[1].trim();
  return `${generation}기 ${name}`;
}

// Supabase Auth 가 Google OAuth 완료 후 호출하는 콜백.
//   1) authorization code → session 교환
//   2) 이메일 도메인 검증 (Google hd 우회를 막는 진짜 방어선)
//   3) 이메일+구글 계정명으로 full_name 자동 갱신 (매 로그인마다)
//   4) 안전한 next 경로로 복귀
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
  const {
    data: { user },
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !user?.email) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // 1. 도메인 검증 (보안 핵심)
  if (!isAllowedEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/auth/forbidden`);
  }

  // 2. 구글 계정명에서 기수+이름 형식으로 full_name 자동 갱신 (매 로그인마다)
  const googleName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
  const derivedName = deriveFullName(user.email, googleName);

  if (derivedName) {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabaseAdmin
      .from('users')
      .update({ full_name: derivedName })
      .eq('id', user.id);
  }

  // 3. 닉네임 없으면 온보딩으로
  const { data: profile } = await supabase
    .from('users')
    .select('nickname')
    .eq('id', user.id)
    .single();

  if (!profile?.nickname) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
