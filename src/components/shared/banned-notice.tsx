import { Ban } from "lucide-react";

import { banNotice } from "@/lib/admin/ban";

/** 차단된 사람에게 글쓰기 자리에서 보이는 안내 한 줄 */
export function BannedNotice({ until }: { until: string | null }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
      <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {banNotice(until)}
    </p>
  );
}
