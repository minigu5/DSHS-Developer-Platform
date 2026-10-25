"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { acceptPrivacyPolicy, declinePrivacyPolicy } from "@/lib/privacy/actions";
import { PRIVACY_COOKIE, PRIVACY_POLICY_VERSION } from "@/lib/privacy/config";
import { SECTION_COLORS } from "@/lib/section-colors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// 미들웨어가 DB 에서 동의를 확인하면 심어 두는 쿠키 — 있으면 확인 요청 자체를 건너뛴다.
function hasConsentCookie() {
  return document.cookie.split("; ").includes(`${PRIVACY_COOKIE}=${PRIVACY_POLICY_VERSION}`);
}

/**
 * 로그인했는데 현재 처리방침에 동의하지 않은 사람에게 뜨는 팝업. 닫을 수 없다(X·Esc·바깥 클릭 모두 무시).
 * 동의하거나, 동의하지 않고 로그아웃하는 두 길뿐. `/privacy` 에서는 읽을 수 있게 띄우지 않는다.
 * 루트 레이아웃에 두지만 서버에서 쿠키를 읽지 않아 홈·목록의 캐시(ISR)를 깨지 않는다.
 */
export function PrivacyGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [needed, setNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (hasConsentCookie()) return;
    let cancelled = false;
    const supabase = createClient();

    async function check() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("privacy_consents")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("policy_version", PRIVACY_POLICY_VERSION)
        .maybeSingle();
      if (!cancelled && !data) setNeeded(true);
    }
    void check();

    return () => {
      cancelled = true;
    };
  }, []);

  function accept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptPrivacyPolicy();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setNeeded(false);
      router.refresh();
    });
  }

  function decline() {
    setError(null);
    startTransition(async () => {
      const res = await declinePrivacyPolicy();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      // 서버에서 이미 로그아웃했지만, 헤더(AuthButtons)가 로그아웃 상태를 알게 브라우저 쪽도 정리한다
      await createClient().auth.signOut();
      setNeeded(false);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Dialog open={needed && !pathname.startsWith("/privacy")} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="gap-5 p-5 sm:max-w-md sm:p-6">
        <DialogHeader className="items-start gap-3">
          <span
            className={cn("flex h-10 w-10 items-center justify-center rounded-xl", SECTION_COLORS.privacy.tile)}
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <DialogTitle className="font-heading text-lg font-bold leading-snug text-zinc-900 dark:text-white">
            개인정보 처리방침에 동의해 주세요
          </DialogTitle>
          <DialogDescription className="leading-relaxed break-keep">
            이 사이트를 계속 쓰려면 동의가 필요해요. 동의는 언제든 철회할 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <li>
            <strong className="font-semibold text-zinc-900 dark:text-white">받는 정보</strong>: 학교 구글 계정의 이메일·이름·프로필 사진,
            닉네임, 직접 쓴 프로필과 글
          </li>
          <li>
            <strong className="font-semibold text-zinc-900 dark:text-white">공개 범위</strong>: 프로필과 공개 글은 누구나 볼 수 있어요
          </li>
          <li>
            <strong className="font-semibold text-zinc-900 dark:text-white">맡긴 곳</strong>: Supabase, Cloudflare, Cloudinary, Google
            (일부는 해외 업체)
          </li>
          <li>
            <strong className="font-semibold text-zinc-900 dark:text-white">철회</strong>: 처리방침 페이지에서 탈퇴하면 내 계정과 글이 모두 지워져요
          </li>
        </ul>

        <a
          href="/privacy"
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded-sm text-[13px] font-medium text-blue-700 underline underline-offset-4 hover:text-blue-800 dark:text-blue-300"
        >
          처리방침 전문 보기 (새 탭)
        </a>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={decline}
            className="h-10 rounded-full px-4 text-[13px] text-zinc-600 dark:text-zinc-400"
          >
            동의하지 않고 로그아웃
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={accept}
            className={cn("h-10 rounded-full px-5 text-[13px]", SECTION_COLORS.privacy.button)}
          >
            동의하고 계속
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
