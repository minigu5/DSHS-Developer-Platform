"use client";

// 프로젝트 상세에서 소유자에게만 보이는 "설명 속 옛 주소" 안내. 보일지와 바뀔 줄은 상세 페이지가 서버에서 계산한다
// (소유자·연결된 주소 있음·설명에 옛 주소 있음). 주소는 늘 …dshs.dev 라 조사는 "를"·"로". "바꾸기"는 서버 액션이 다시 찾아서 바꾼다.
// ×는 이 브라우저에서 그 프로젝트·그 주소에 대해서만 다시 안 띄운다.

import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowDown, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";
import { replaceOldAddressesInDescription } from "@/lib/projects/actions";

const MAX_LINES = 3;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

type Props = {
  projectId: string;
  fqdn: string;
  lines: { before: string; after: string }[];
  readmeSync: boolean;
};

export function OldAddressNudge({ projectId, fqdn, lines, readmeSync }: Props) {
  const key = `old-address-nudge-dismissed:${projectId}:${fqdn}`;
  const stored = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    // 서버·첫 그림에서는 숨겨 두고, 기록을 읽은 뒤 띄운다(닫았던 사람에게 깜빡이지 않게)
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (stored || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      // 못 남겨도 이 화면에선 숨긴다
    }
  };

  const replace = () =>
    startTransition(async () => {
      const result = await replaceOldAddressesInDescription(projectId);
      if (result.ok) toast.success(`설명의 주소를 ${fqdn}로 바꿨어요`);
      else toast.error(result.error);
    });

  const shown = lines.slice(0, MAX_LINES);

  return (
    <section
      aria-labelledby="old-address-nudge-title"
      className="relative mt-8 rounded-3xl border border-zinc-200 bg-white p-5 duration-200 animate-in fade-in motion-reduce:animate-none sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="옛 주소 안내 닫기"
        className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      <p className="pr-8 text-sm text-zinc-500 dark:text-zinc-400">나에게만 보이는 안내예요</p>
      <h2 id="old-address-nudge-title" className="font-heading mt-1 pr-8 text-lg font-bold tracking-tight break-keep text-zinc-900 dark:text-white">
        설명에 옛 주소가 남아 있어요. 바꾸시겠어요?
      </h2>
      <p className="mt-1 text-sm text-zinc-700 break-keep dark:text-zinc-300">
        <span className="font-mono">{fqdn}</span>를 연결했는데 상세 설명에는 아직 옛 주소가 적혀 있어요. 확인하고 새 주소로 바꿔 보세요.
      </p>

      <ul className="mt-4 space-y-3">
        {shown.map((line, i) => (
          <li key={i} className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-800/60">
            <p className="line-clamp-2 break-all text-zinc-500 dark:text-zinc-400">
              <span className="sr-only">지금: </span>
              <del>{line.before}</del>
            </p>
            <ArrowDown className="my-1 h-3.5 w-3.5 text-zinc-400" aria-hidden />
            <p className="line-clamp-2 break-all font-medium text-zinc-900 dark:text-white">
              <span className="sr-only">바꾸면: </span>
              {line.after}
            </p>
          </li>
        ))}
      </ul>
      {lines.length > MAX_LINES && (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">외 {lines.length - MAX_LINES}줄도 같이 바뀌어요.</p>
      )}
      {readmeSync && (
        <p className="mt-3 text-sm text-zinc-700 break-keep dark:text-zinc-300">
          README와 동기화 중이라 GitHub README도 고쳐야 해요. 안 고치면 README가 바뀔 때 옛 주소로 돌아가요.
        </p>
      )}

      <button
        type="button"
        onClick={replace}
        disabled={pending}
        className={cn(
          "mt-5 inline-flex h-11 items-center rounded-full px-5 text-[15px] font-semibold transition-colors disabled:opacity-60",
          SECTION_COLORS.domains.button,
        )}
      >
        {pending ? "바꾸는 중…" : "새 주소로 바꾸기"}
      </button>
    </section>
  );
}
