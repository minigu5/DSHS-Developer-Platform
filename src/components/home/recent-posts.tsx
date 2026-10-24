import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, Megaphone, Newspaper, Pin } from "lucide-react";

import { cn, isExternalImage } from "@/lib/utils";
import { ANNOUNCEMENT_CATEGORIES, ADMIN_ANNOUNCEMENT_CATEGORY, FEATURES, PROJECT_TYPES } from "@/lib/constants";

export type RecentTip = {
  id: string;
  title: string;
  cover_url: string | null;
  authorName: string;
  likeCount: number;
  commentCount: number;
};
export type RecentIdea = {
  id: string;
  title: string;
  type: string;
  category: string;
  status: "open" | "in_progress" | "done";
  authorName: string;
};
export type RecentAnnouncement = {
  id: string;
  title: string;
  category: string;
  is_pinned: boolean;
};

const revealOrder = (n: number) => ({ "--reveal-delay": `${n * 90}ms` }) as CSSProperties;

const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(ANNOUNCEMENT_CATEGORIES.map((c) => [c.value, c.label])),
  [ADMIN_ANNOUNCEMENT_CATEGORY.value]: ADMIN_ANNOUNCEMENT_CATEGORY.label,
};
// 티커(`announcement-ticker.tsx`)와 같은 카테고리 색
const CATEGORY_COLORS: Record<string, string> = {
  promotion: "bg-blue-100/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  beta: "bg-violet-100/80 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  feedback: "bg-amber-100/80 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  update: "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  general: "bg-zinc-100/80 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400",
  admin: "bg-rose-100/80 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};
const IDEA_STATUS: Record<RecentIdea["status"], { label: string; cls: string }> = {
  open: { label: "구현 요청 중", cls: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  in_progress: { label: "개발 중", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  done: { label: "구현 완료", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
};
const labelOf = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

function Column({
  icon: Icon,
  tileClass,
  title,
  href,
  order,
  children,
  footer,
}: {
  icon: React.ElementType;
  tileClass: string;
  title: string;
  href: string;
  order: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="reveal flex flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      style={revealOrder(order)}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800/60">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          <span className={cn("grid h-6 w-6 place-items-center rounded-lg", tileClass)} aria-hidden>
            <Icon className="h-3.5 w-3.5" />
          </span>
          {title}
        </h3>
        <Link
          href={href}
          className="text-xs text-zinc-600 hover:underline underline-offset-4 dark:text-zinc-400 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          전체 보기
        </Link>
      </div>
      {children}
      {footer && (
        <div className="mt-auto border-t border-dashed border-zinc-200 px-4 py-3.5 text-[13px] leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 break-keep">
          {footer}
        </div>
      )}
    </div>
  );
}

const rowClass =
  "flex min-w-0 items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600";

/** 홈 "요즘 올라온 글" — 개발 팁 · 해줘! · 공지사항 세 칸. 비어 있으면 첫 글을 쓰도록 안내. */
export function RecentPosts({
  tips,
  ideas,
  announcements,
}: {
  tips: RecentTip[];
  ideas: RecentIdea[];
  announcements: RecentAnnouncement[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Column
        icon={Newspaper}
        tileClass="bg-tip-100 text-tip-700 dark:bg-tip-950 dark:text-tip-300"
        title="개발 팁"
        href="/tips"
        order={0}
        footer={
          <>
            알게 된 노하우가 있다면{" "}
            <Link href="/tips/new" className="font-semibold text-tip-700 dark:text-tip-300 hover:underline underline-offset-4">
              팁을 써 주세요
            </Link>
            .
          </>
        }
      >
        {tips.length > 0 ? (
          <ul>
            {tips.map((tip) => (
              <li key={tip.id}>
                <Link href={`/tips/${tip.id}`} className={rowClass}>
                  <span className="relative h-[42px] w-14 shrink-0 overflow-hidden rounded-[10px] bg-zinc-100 dark:bg-zinc-800">
                    {tip.cover_url && (
                      <Image src={tip.cover_url} alt="" fill sizes="56px" className="object-cover" unoptimized={isExternalImage(tip.cover_url)} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{tip.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {tip.authorName}
                      {tip.likeCount > 0 && ` · 좋아요 ${tip.likeCount}`}
                      {tip.commentCount > 0 && ` · 댓글 ${tip.commentCount}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-[13px] text-zinc-600 dark:text-zinc-400">아직 올라온 팁이 없어요.</p>
        )}
      </Column>

      <Column
        icon={Megaphone}
        tileClass="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
        title="해줘!"
        href="/haejwo"
        order={1}
        footer={
          <>
            있으면 좋겠는 프로그램이 있나요?{" "}
            <Link href="/haejwo/new" className="font-semibold text-orange-700 dark:text-orange-400 hover:underline underline-offset-4">
              해줘!에 올려 보세요
            </Link>
            .
          </>
        }
      >
        {ideas.length > 0 ? (
          <ul>
            {ideas.map((idea) => {
              const status = IDEA_STATUS[idea.status] ?? IDEA_STATUS.open;
              return (
                <li key={idea.id}>
                  <Link href={`/haejwo/${idea.id}`} className={rowClass}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{idea.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-zinc-600 dark:text-zinc-400">
                        {labelOf(PROJECT_TYPES, idea.type)} · {labelOf(FEATURES, idea.category)} · {idea.authorName}
                      </span>
                    </span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", status.cls)}>{status.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-5 text-[13px] text-zinc-600 dark:text-zinc-400">아직 올라온 요청이 없어요.</p>
        )}
      </Column>

      <Column
        icon={Bell}
        tileClass="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
        title="공지사항"
        href="/announcements"
        order={2}
        footer={
          announcements.length === 0 ? (
            <>
              홍보·베타 테스트 모집은{" "}
              <Link href="/announcements/new" className="font-semibold text-sky-700 dark:text-sky-400 hover:underline underline-offset-4">
                공지사항에 올려요
              </Link>
              .
            </>
          ) : undefined
        }
      >
        {announcements.length > 0 ? (
          <ul>
            {announcements.map((a) => (
              <li key={a.id}>
                <Link href={`/announcements/${a.id}`} className={rowClass}>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", CATEGORY_COLORS[a.category] ?? CATEGORY_COLORS.general)}>
                    {CATEGORY_LABELS[a.category] ?? a.category}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-zinc-900 dark:text-white">{a.title}</span>
                    {a.is_pinned && (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <Pin className="h-3 w-3" aria-hidden />
                        고정됨
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-5 text-[13px] text-zinc-600 dark:text-zinc-400">아직 올라온 공지가 없어요.</p>
        )}
      </Column>
    </div>
  );
}
