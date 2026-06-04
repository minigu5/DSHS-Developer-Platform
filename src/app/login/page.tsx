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
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-6 bg-zinc-50 dark:bg-black relative overflow-hidden font-sans">
      
      {/* Background ambient glow matching the main aesthetic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 dark:bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/20 dark:bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-4 ml-2 group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
          메인으로 돌아가기
        </Link>

        <Card className="rounded-3xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4">
            <CardTitle className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              환영합니다
            </CardTitle>
            <CardDescription className="text-base mt-2">
              대구과학고 학생 개발자들의 프로젝트 허브
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

            <div className="flex items-start justify-center gap-2 p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-950/50 text-xs text-zinc-600 dark:text-zinc-400 text-left border border-zinc-200/50 dark:border-zinc-800/50">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <p>
                보안을 위해 <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> 구글 계정으로만 인증할 수 있습니다. 
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
