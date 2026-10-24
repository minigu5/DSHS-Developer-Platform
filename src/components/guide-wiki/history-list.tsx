import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Eye, GitCompare, RotateCcw } from "lucide-react";

import { cn, isExternalImage } from "@/lib/utils";
import { describeStats } from "@/lib/guide-wiki/diff";
import { formatKst, versionRo } from "@/lib/guide-wiki/format";
import type { RevisionListItem } from "@/lib/guide-wiki/read";
import { RevertDialog } from "@/components/guide-wiki/revert-dialog";

const WITHDRAWN = "탈퇴한 사용자";

const CHIP = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

const ROW_BUTTON =
  "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-white px-3.5 text-[13px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:min-h-8 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white";

interface HistoryRowProps {
  docKey: string;
  item: RevisionListItem;
  /** 지금 최신 버전 번호. */
  latestRev: number;
  /** 이 버전을 무효로 만든 되돌리기 버전(없으면 undefined). */
  revertedBy: number | undefined;
  signedIn: boolean;
}

export function Avatar({
  name,
  url,
  large = false,
}: {
  name: string;
  url: string | null;
  large?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
        large ? "h-10 w-10 text-[15px]" : "h-8 w-8 text-[13px]",
      )}
      aria-hidden
    >
      {url ? (
        <Image
          src={url}
          alt=""
          fill
          sizes={large ? "40px" : "32px"}
          className="object-cover"
          unoptimized={isExternalImage(url)}
        />
      ) : (
        name.charAt(0)
      )}
    </span>
  );
}

/** 고친 기록 한 줄. 서버 화면과 "더 보기"가 함께 쓴다. */
export function HistoryRow({ docKey, item, latestRev, revertedBy, signedIn }: HistoryRowProps) {
  const isCurrent = item.revNo === latestRev;
  const isRevert = item.kind === "revert" && item.revertOf !== null;
  const isSource = item.kind === "seed" || item.kind === "sync";
  const { nickname, id, avatarUrl } = item.author;
  const authorName = nickname ?? WITHDRAWN;
  const changes = describeStats(item.stats);
  const showCounts = item.stats.plus > 0 || item.stats.minus > 0;
  const base = `/guide-wiki/${docKey}`;

  return (
    <li
      className={cn(
        "border-t border-zinc-100 px-5 py-[18px] first:border-t-0 dark:border-zinc-800",
        revertedBy !== undefined && "bg-zinc-50 dark:bg-zinc-900/50",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-3">
        <span className="w-9 shrink-0 pt-0.5 font-mono text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
          r{item.revNo}
        </span>
        <Avatar name={authorName} url={nickname !== null ? avatarUrl : null} />
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {nickname !== null && id !== null ? (
              <Link
                href={`/developers/${id}`}
                className="text-sm font-semibold text-zinc-900 hover:underline dark:text-white"
              >
                {authorName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                {authorName}
              </span>
            )}
            <time
              dateTime={item.createdAt}
              title={formatKst(item.createdAt)}
              className="text-[13px] text-zinc-500 dark:text-zinc-400"
            >
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
            </time>
            {isCurrent && (
              <span className={cn(CHIP, "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900")}>
                지금 보이는 버전
              </span>
            )}
            {isSource && (
              <span
                className={cn(
                  CHIP,
                  "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
                )}
              >
                저장소 원본
              </span>
            )}
            {isRevert && (
              <span className={cn(CHIP, "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
                <RotateCcw className="h-[11px] w-[11px]" aria-hidden />
                {versionRo(item.revertOf as number)} 되돌림
              </span>
            )}
            {revertedBy !== undefined && (
              <span className={cn(CHIP, "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200")}>
                버전 {revertedBy}에서 되돌려짐
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-[15px] leading-normal",
              revertedBy !== undefined
                ? "text-zinc-500 line-through dark:text-zinc-400"
                : "text-zinc-800 dark:text-zinc-100",
            )}
          >
            {item.summary}
          </p>
          {(changes !== "" || showCounts) && (
            <div className="flex flex-wrap gap-x-2.5 text-xs text-zinc-500 dark:text-zinc-400">
              {changes !== "" && <span>{changes}</span>}
              {showCounts && (
                <>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    <span className="sr-only">추가 </span>+{item.stats.plus.toLocaleString("en-US")}
                  </span>
                  <span className="font-mono tabular-nums text-rose-700 dark:text-rose-400">
                    <span className="sr-only">삭제 </span>−{item.stats.minus.toLocaleString("en-US")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`${base}/rev/${item.revNo}`}
            aria-label={`버전 ${item.revNo} 보기`}
            className={ROW_BUTTON}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            보기
          </Link>
          {item.kind !== "seed" && (
            <Link
              href={`${base}/diff?to=${item.revNo}`}
              aria-label={`버전 ${item.revNo}에서 바뀐 점`}
              className={ROW_BUTTON}
            >
              <GitCompare className="h-3.5 w-3.5" aria-hidden />
              바뀐 점
            </Link>
          )}
          {!isCurrent && (
            <RevertDialog
              docKey={docKey}
              targetRev={item.revNo}
              latestRev={latestRev}
              signedIn={signedIn}
            />
          )}
        </div>
      </div>
    </li>
  );
}

interface HistoryListProps extends Omit<HistoryRowProps, "item" | "revertedBy"> {
  items: RevisionListItem[];
  /** revNo -> 그 버전을 무효로 만든 되돌리기 버전. */
  reverted: Record<number, number>;
  /** 목록 맨 아래에 이어 붙일 것("더 보기"). */
  children?: ReactNode;
}

/** 고친 기록 목록(최신순). */
export function HistoryList({ docKey, items, latestRev, reverted, signedIn, children }: HistoryListProps) {
  return (
    <ol
      aria-label="고친 기록"
      className="overflow-hidden rounded-[20px] border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      {items.map((item) => (
        <HistoryRow
          key={item.revNo}
          docKey={docKey}
          item={item}
          latestRev={latestRev}
          revertedBy={reverted[item.revNo]}
          signedIn={signedIn}
        />
      ))}
      {children}
    </ol>
  );
}
