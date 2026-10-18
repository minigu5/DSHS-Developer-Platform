import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

import { GoogleLoginButton } from '@/components/auth/google-login-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ALLOWED_EMAIL_DOMAIN } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: '로그인 — DSHS Developer Platform',
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

// 외부 redirect 방지: 같은 origin 의 경로만 허용
function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith('/') || next.startsWith('//')) return undefined;
  return next;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'OAuth 코드가 누락되었습니다. 다시 시도해주세요.',
  exchange_failed: '세션 교환에 실패했습니다. 다시 시도해주세요.',
  domain_not_allowed: `@${ALLOWED_EMAIL_DOMAIN} 도메인 계정만 로그인할 수 있습니다.`,
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const errorMsg = params.error ? ERROR_MESSAGES[params.error] : undefined;

  // 미들웨어가 처리하지만 이중 안전망
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next ?? '/');

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-950">

      <div className="w-full max-w-md">
        <Link
          href="/explore"
          className="inline-flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-4 ml-2 rounded-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" aria-hidden />
          모든 프로젝트로 돌아가기
        </Link>

        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              <h1>로그인</h1>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              학교 구글 계정으로 로그인해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-8 pb-10">
            {errorMsg ? (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400 font-medium"
              >
                {errorMsg}
              </div>
            ) : null}

            <div className="pt-2 pb-4">
              <GoogleLoginButton next={next} />
            </div>

            <div className="flex items-start justify-center gap-2 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-300 text-left border border-zinc-200 dark:border-zinc-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" aria-hidden />
              <p>
                <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> 계정만 로그인할 수 있어요. 개인 구글 계정은 막혀 있어요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
