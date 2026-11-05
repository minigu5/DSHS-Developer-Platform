import type { Counts, SiteStats } from "@/lib/admin/read";

const ITEMS: { key: keyof Counts; label: string }[] = [
  { key: "users", label: "새 가입" },
  { key: "projects", label: "새 프로젝트" },
  { key: "projectComments", label: "프로젝트 댓글" },
  { key: "clicks", label: "프로젝트 방문" },
  { key: "tips", label: "개발 팁" },
  { key: "tipComments", label: "팁 댓글" },
  { key: "ideas", label: "해줘" },
  { key: "guideEdits", label: "위키 수정" },
];

const CARD = "rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

/** 사이트 현황 — 오늘 큰 숫자, 아래 어제·7일. 날짜는 한국 시간 기준 */
export function StatGrid({ stats }: { stats: SiteStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map(({ key, label }) => (
        <div key={key} className={CARD}>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{stats.today[key]}</p>
          <p className="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            어제 {stats.yesterday[key]} · 7일 {stats.week[key]}
          </p>
        </div>
      ))}
      <div className={CARD}>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">연결된 주소</p>
        <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{stats.activeDomains}</p>
      </div>
      <div className={CARD}>
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">차단 중</p>
        <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{stats.activeBans}</p>
      </div>
    </div>
  );
}
