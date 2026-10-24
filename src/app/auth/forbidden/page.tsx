import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthShell, AuthNote, AUTH_TITLE_CLASS, AUTH_LEAD_CLASS, riseDelay } from "@/components/auth/auth-shell";
import { SECTION_COLORS } from "@/lib/section-colors";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";

export const metadata = {
  title: "접근 권한 없음 — DSHS Developer Platform",
};

export default function ForbiddenPage() {
  return (
    <AuthShell mark="warning">
      <h1 className={AUTH_TITLE_CLASS} style={riseDelay(60)}>
        이 계정으로는 들어올 수 없어요
      </h1>
      <p className={AUTH_LEAD_CLASS} style={riseDelay(120)}>
        대구과학고 <strong className="font-semibold text-zinc-900 dark:text-white">@{ALLOWED_EMAIL_DOMAIN}</strong> 계정만 쓸 수 있어요. 학교에서
        받은 구글 계정으로 다시 로그인해 주세요.
      </p>

      <div className="rise mt-7 sm:mt-9" style={riseDelay(180)}>
        <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-5 text-sm", SECTION_COLORS.explore.button)}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          다른 계정으로 로그인
        </Link>
      </div>

      <AuthNote>개인 구글 계정으로 로그인하면 이 화면이 나와요. 학교 계정이 없거나 만료됐다면 정보부에 문의해요.</AuthNote>
    </AuthShell>
  );
}
