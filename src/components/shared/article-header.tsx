import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

import { isExternalImage } from "@/lib/utils";

type ArticleHeaderProps = {
  backHref: string;
  backLabel: string;
  /** 오른쪽 끝 — 수정/삭제/고정 버튼(권한자만) */
  actions?: ReactNode;
  /** 제목 위 칩 줄 — 태그·카테고리·상태 */
  chips?: ReactNode;
  title: string;
  /** 제목 아래 한 줄 요약(팁) */
  lead?: string | null;
  author: { id: string; name: string; avatarUrl: string | null };
  dateLabel: string;
  /** 날짜 뒤에 붙는 추가 정보("· 팀 프로젝트" 등) */
  extraMeta?: string;
};

/**
 * 글 상세(팁·해줘·공지)의 머리 — "← 목록" 줄, 칩, h1, 요약, 작성자 줄.
 * 작성자 영역은 프로필 링크. 본문은 이 아래 `ReadingSurface`에 둔다.
 */
export function ArticleHeader({
  backHref,
  backLabel,
  actions,
  chips,
  title,
  lead,
  author,
  dateLabel,
  extraMeta,
}: ArticleHeaderProps) {
  return (
    <header>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-sm text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>

      {chips && <div className="mt-4 flex flex-wrap items-center gap-1.5">{chips}</div>}

      <h1 className="mt-3 font-heading text-3xl font-bold leading-[1.2] tracking-tight text-zinc-900 break-keep dark:text-white sm:text-4xl">
        {title}
      </h1>

      {lead && <p className="mt-2.5 text-[17px] leading-relaxed text-zinc-600 break-keep dark:text-zinc-400">{lead}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-zinc-500 dark:text-zinc-400">
        <Link
          href={`/developers/${author.id}`}
          className="group/author inline-flex items-center gap-2.5 rounded-full"
        >
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
                unoptimized={isExternalImage(author.avatarUrl)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200" aria-hidden>
                {author.name.charAt(0)}
              </span>
            )}
          </span>
          <span className="font-semibold text-zinc-900 underline-offset-4 group-hover/author:underline dark:text-white">
            {author.name}
          </span>
        </Link>
        <span aria-hidden>·</span>
        <span>{dateLabel}</span>
        {extraMeta && (
          <>
            <span aria-hidden>·</span>
            <span>{extraMeta}</span>
          </>
        )}
      </div>
    </header>
  );
}
