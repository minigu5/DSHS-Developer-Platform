import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SECTION_COLORS, type SectionKey } from "@/lib/section-colors";

type PageHeroProps = {
  section: SectionKey;
  icon: LucideIcon;
  title: string;
  /** 한 줄 설명. 모바일에서는 숨겨 머리 높이를 낮춘다(2026-10-24 결정). compact 변형에서는 렌더하지 않는다. */
  description?: string;
  /** 알약 버튼들 — 가운데 정렬 flex 안에 들어간다 */
  actions?: ReactNode;
  /** 머리 아래 추가 요소(검색창·세그먼트·프로필 정보 등) */
  children?: ReactNode;
  /** default = 목록·상세 진입 페이지, compact = 에디터·위저드처럼 입력이 주인공인 페이지 */
  variant?: "default" | "compact";
  /** 아이콘 타일 대신 보여줄 요소(프로필 아바타) */
  avatar?: ReactNode;
  /** md = max-w-5xl(기본), lg = max-w-6xl(탐색) */
  maxWidth?: "md" | "lg";
  className?: string;
};

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

/**
 * 페이지 머리 — 홈 히어로의 축소판. 가운데 정렬 세로 스택: 섹션 색 아이콘 타일 → h1 → 설명 → 알약 버튼 → 추가 요소.
 * 배경은 홈과 같은 모눈(`.paper-grid`, 물결). 로드 시 머리 요소만 `.rise`로 한 번 등장한다(카드·목록은 애니메이션 없음).
 */
export function PageHero({
  section,
  icon: Icon,
  title,
  description,
  actions,
  children,
  variant = "default",
  avatar,
  maxWidth = "md",
  className,
}: PageHeroProps) {
  const compact = variant === "compact";
  const color = SECTION_COLORS[section];

  return (
    <section
      className={cn(
        "paper-grid border-b border-zinc-200 px-6 dark:border-zinc-800",
        compact ? "pt-[22px] pb-5 sm:pt-[30px] sm:pb-[26px]" : "pt-8 pb-7 sm:pt-12 sm:pb-10",
        className,
      )}
    >
      <div
        className={cn(
          "relative z-10 mx-auto flex flex-col items-center text-center",
          maxWidth === "lg" ? "max-w-6xl" : "max-w-5xl",
        )}
      >
        {avatar ?? (
          <span
            className={cn(
              "rise inline-flex items-center justify-center",
              compact ? "h-9 w-9 rounded-[10px]" : "h-11 w-11 rounded-xl",
              color.tile,
            )}
            aria-hidden
          >
            <Icon className={compact ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} />
          </span>
        )}

        <h1
          className={cn(
            "rise font-heading font-bold leading-[1.15] tracking-tight text-zinc-900 break-keep dark:text-white",
            compact ? "mt-3 text-2xl sm:text-[28px]" : "mt-[18px] text-3xl sm:text-[40px]",
          )}
          style={riseDelay(60)}
        >
          {title}
        </h1>

        {!compact && description && (
          <p
            className="rise mt-3 hidden max-w-[36em] text-[17px] leading-relaxed text-zinc-600 break-keep sm:block dark:text-zinc-400"
            style={riseDelay(120)}
          >
            {description}
          </p>
        )}

        {actions && (
          <div className="rise mt-6 flex flex-wrap justify-center gap-2.5" style={riseDelay(180)}>
            {actions}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
