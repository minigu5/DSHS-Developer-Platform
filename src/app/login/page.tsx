import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { AuthShell, AuthNote, AUTH_TITLE_CLASS, AUTH_LEAD_CLASS, riseDelay } from "@/components/auth/auth-shell";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "로그인 — DSHS Developer Platform",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

// 외부 redirect 방지: 같은 origin 의 경로만 허용
function safeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "OAuth 코드가 누락되었어요. 다시 시도해 주세요.",
  exchange_failed: "세션 교환에 실패했어요. 다시 시도해 주세요.",
  domain_not_allowed: `@${ALLOWED_EMAIL_DOMAIN} 계정만 로그인할 수 있어요. 다른 구글 계정으로 시도했어요.`,
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
  if (user) redirect(next ?? "/");

  return (
    <AuthShell mark="logo">
      <h1 className={AUTH_TITLE_CLASS} style={riseDelay(60)}>
        로그인
      </h1>
      <p className={AUTH_LEAD_CLASS} style={riseDelay(120)}>
        학교 구글 계정으로 로그인해요.
      </p>

      <div className="rise mt-7 w-full max-w-[460px] sm:mt-10" style={riseDelay(180)}>
        <GoogleLoginButton next={next} />
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rise mt-[18px] w-full max-w-[460px] rounded-[14px] bg-rose-50 px-3.5 py-3 text-left text-[13px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          style={riseDelay(220)}
        >
          {errorMsg}
        </div>
      )}

      <AuthNote>
        <strong className="font-semibold text-zinc-900 dark:text-white">@{ALLOWED_EMAIL_DOMAIN}</strong> 계정만 로그인할 수 있어요. 개인 구글
        계정은 막혀 있어요. 졸업생도 학교 계정이 살아 있으면 그대로 써요.
      </AuthNote>

      <Link
        href="/explore"
        className="rise mt-[26px] inline-flex items-center gap-1 rounded-sm text-[13px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        style={riseDelay(280)}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        모든 프로젝트로 돌아가기
      </Link>
    </AuthShell>
  );
}
