import { NextResponse, type NextRequest } from 'next/server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

  // 2. student_mappings 테이블에서 실명 조회 (보안 마이그레이션)
  const { data: mapping } = await (supabase
    .from('student_mappings')
    .select('student_name')
    .eq('email', user.email)
    .single() as any);

  if (mapping?.student_name) {
    // Use service role key to bypass RLS for initial name sync
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin
      .from('users')
      .update({ full_name: mapping.student_name })
      .eq('id', user.id);
  }

  // Check if user has a nickname. If not, they need onboarding.
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
