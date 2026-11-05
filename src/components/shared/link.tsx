"use client";

import type { ComponentProps } from "react";
import NextLink from "next/link";

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch"> & {
  /**
   * true 면 화면에 보일 때 페이지 내용까지 통째로 미리 받는다(prefetch={true}) — 위쪽·아래쪽 메뉴 5칸에만 쓴다.
   * 무료 Cloudflare는 한국 접속이 LA를 거쳐 서버 왕복이 1~2초라, 미리 안 받으면 폰에서 메뉴를 누를 때마다 그만큼 멈췄다(2026-11-05).
   * 뼈대만 받는 기본값(auto)은 뼈대 뒤에 또 1~2초 기다려서 11-04 전처럼 내용까지 받는다. 라우터가 staleTimes 동안 캐시한다.
   */
  prefetchOnView?: boolean;
};

/**
 * 사이트 전체에서 쓰는 링크 — next/link 대신 이것을 import 한다.
 * next/link 기본값은 화면에 보이는 링크를 전부 미리 받아 페이지마다 dshs.dev 요청이 25~30개 생겼다
 * (학교는 IP 하나라 Cloudflare 속도 제한 100회/10초에 걸리고, 요청마다 Worker CPU를 씀).
 * 그래서 미리 받지 않는다. 2026-11-04~05엔 마우스를 올리거나 손가락을 댈 때 router.prefetch 했는데,
 * 그 미리 받기가 끝나기 전에 누르면(폰은 거의 항상) Next 16.4가 뼈대(loading.tsx) 없이 머리·바닥 사이를 비운 채
 * 서버 응답을 기다렸다 — 상세가 느린 프로젝트는 몇 초 동안 빈 화면(2026-11-05 사용자 제보·실측 7번 중 5번).
 * 미리 받지 않으면 누른 뒤 0.5~1초 이전 화면이 남았다가 뼈대가 뜬다.
 */
export default function Link({ prefetchOnView, ...rest }: Props) {
  return <NextLink prefetch={prefetchOnView ? true : false} {...rest} />;
}
