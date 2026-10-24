"use client";

import { useEffect } from "react";

/**
 * 홈 스크롤 리빌 트리거 — `.reveal` 요소가 뷰포트에 15% 이상 들어오면 `.is-in`을 붙여 한 번 재생한다.
 * 마운트 전에는 `<html>`에 `reveal-ready`가 없어서 요소가 그냥 보이므로 JS가 늦거나 꺼져도 내용이 숨지 않는다.
 * UI 없음. 홈 페이지에서만 사용.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    root.classList.add("reveal-ready");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
