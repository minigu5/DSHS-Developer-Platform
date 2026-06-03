import { NextResponse, type NextRequest } from 'next/server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { isAllowedEmail } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { USER_EMAIL_MAP } from '@/lib/userEmails';

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

  // Update user's full_name if found in the mapping
  if (user.email) {
    const mappedNameEntry = Object.entries(USER_EMAIL_MAP).find(
      ([, email]) => email === user.email
    );
    if (mappedNameEntry) {
      const [mappedName] = mappedNameEntry;
      
      // Use service role key to bypass RLS and guarantee the update succeeds
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabaseAdmin
        .from('users')
        .update({ full_name: mappedName })
        .eq('id', user.id);
    }
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
