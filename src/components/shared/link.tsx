"use client";

import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch"> & {
  /**
   * true 면 next/link 기본값대로 화면에 보일 때 미리 받는다 — 위쪽·아래쪽 메뉴 5칸에만 쓴다.
   * 무료 Cloudflare는 한국 접속이 LA를 거쳐 서버 왕복이 1~2초라, 미리 안 받으면 폰에서 메뉴를 누를 때마다 그만큼 멈췄다(2026-11-05).
   * 동적 페이지는 loading.tsx 뼈대까지만 받아 가볍고, 라우터가 staleTimes 동안 캐시해 페이지마다 다시 받지 않는다.
   */
  prefetchOnView?: boolean;
};

/**
 * 사이트 전체에서 쓰는 링크 — next/link 대신 이것을 import 한다.
 * next/link 기본값은 화면에 보이는 링크를 전부 미리 받아 페이지마다 dshs.dev 요청이 25~30개 생겼다
 * (학교는 IP 하나라 Cloudflare 속도 제한 100회/10초에 걸리고, 요청마다 Worker CPU를 씀).
 * 그래서 화면에 보일 때는 받지 않고, 마우스를 올리거나·손가락을 대거나·키보드로 포커스할 때만 미리 받는다.
 * next/link 는 prefetch={false} 면 hover 미리 받기도 꺼서 router.prefetch 를 직접 부른다(같은 주소는 라우터가 캐시).
 */
export default function Link({ href, prefetchOnView, onMouseEnter, onTouchStart, onFocus, ...rest }: Props) {
  const router = useRouter();
  const target = typeof href === "string" ? href : null;

  function prefetch() {
    // 외부 주소·해시 링크는 미리 받을 게 없다
    if (target && target.startsWith("/") && !target.startsWith("//")) router.prefetch(target);
  }

  if (prefetchOnView) return <NextLink href={href} onMouseEnter={onMouseEnter} onTouchStart={onTouchStart} onFocus={onFocus} {...rest} />;

  return (
    <NextLink
      href={href}
      prefetch={false}
      onMouseEnter={(e: MouseEvent<HTMLAnchorElement>) => {
        onMouseEnter?.(e);
        prefetch();
      }}
      onTouchStart={(e: TouchEvent<HTMLAnchorElement>) => {
        onTouchStart?.(e);
        prefetch();
      }}
      onFocus={(e: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(e);
        prefetch();
      }}
      {...rest}
    />
  );
}
