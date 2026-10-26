import { cn } from "@/lib/utils";

// 바로가기 주소(Workers·Firebase) 표시 — 진짜 도메인 연결과 헷갈리지 않게 상태 알약 옆에 단다
export function RedirectPill({ className }: { className?: string }) {
  return (
    <span
      title="들어오면 보낼 곳 주소로 넘어가요"
      className={cn(
        "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        className,
      )}
    >
      바로가기
    </span>
  );
}
