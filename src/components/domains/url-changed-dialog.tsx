"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SECTION_COLORS } from "@/lib/section-colors";
import { cn } from "@/lib/utils";

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.8125rem] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{children}</code>;
}

function Why({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="font-semibold">안 하면? </span>
      {children}
    </p>
  );
}

// 프로젝트 방문 주소를 도메인 주소로 바꾼 직후 — 학생 사이트 쪽(DB·호스트)에 남은 옛 주소를 정리하라고 알린다.
// "바꾸기"가 끝나면 제안 띠가 사라져 UrlSuggestion 이 언마운트되므로, 열림 상태는 부모(DomainSteps)가 쥔다.
export function UrlChangedDialog({
  open,
  onClose,
  oldUrl,
  newUrl,
}: {
  open: boolean;
  onClose: () => void;
  oldUrl: string | null;
  newUrl: string;
}) {
  const oldHost = oldUrl ? hostOf(oldUrl) : null;
  const newHost = hostOf(newUrl);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="max-h-[85dvh] gap-5 overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">방문 주소를 바꿨어요. 이제 내 사이트 쪽도 고쳐 주세요</DialogTitle>
          <DialogDescription>
            이 사이트에 등록된 방문 주소만{" "}
            {oldHost && (
              <>
                <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{oldHost}</span>에서{" "}
              </>
            )}
            <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{newHost}</span>
            로 바뀌었어요. 내 사이트가 쓰는 DB와 올린 곳(호스트)에는 옛 주소가 그대로 남아 있어서, 아래 {oldHost ? "두 가지를" : "한 가지를"} 직접 해야 해요.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-col gap-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">1. DB에 연결된 도메인 정보를 새 주소로 바꿔요</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                쓰는 DB나 로그인(인증) 서비스 설정에 사이트 주소가 적혀 있으면 새 주소 <Code>{newUrl}</Code>로 바꿔요. 서비스마다 <Code>Site URL</Code>, 리다이렉트·콜백 주소, <Code>CORS</Code> 허용 주소(허용 출처)처럼 이름이 달라요.
              </li>
              <li>구글 같은 소셜 로그인을 직접 연결했다면 그쪽 설정의 허용 주소에도 새 주소를 넣어요.</li>
              <li>코드나 환경변수에 옛 주소가 적혀 있으면(예: 사이트 주소를 담은 환경변수) 새 주소로 고치고 다시 배포해요.</li>
            </ul>
            <Why>새 주소에서 로그인하자마자 옛 주소로 되돌아가거나, 허용되지 않은 주소라는 오류가 나요. 이미지·API 주소가 옛 주소로 박혀 있으면 그것도 깨질 수 있어요.</Why>
          </li>

          {oldHost && (
            <li>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                2. 기존 도메인 <span className="font-mono">{oldHost}</span>은 비활성화해요
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>올린 곳(Vercel·Netlify 등)의 도메인 설정에서 옛 도메인을 지우거나, 새 주소로 넘어가게(리다이렉트) 해요. 호스트가 기본 주소(예: ○○.vercel.app)를 못 지우게 하면 그대로 둬도 돼요.</li>
                <li>1번에서 DB·로그인 서비스의 허용 목록에 넣어 둔 옛 주소는 지워요. 새 주소로 사이트가 열리고 로그인이 되는 걸 확인한 다음에 해요.</li>
              </ul>
              <Why>
                같은 사이트가 두 주소로 따로 열려서 로그인·저장 정보가 갈라지고, 검색에도 둘 다 잡혀요. 허용 목록에 남은 옛 주소는 나중에 다른 사람이 그 주소를 가져가도 내 로그인이 통하는 구멍이 될 수 있어요.
              </Why>
            </li>
          )}
        </ol>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
              SECTION_COLORS.domains.button,
            )}
          >
            알겠어요
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
