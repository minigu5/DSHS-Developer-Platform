"use client";

import { useEffect } from "react";

/**
 * 홈 스크롤 리빌 트리거 — `.reveal` 요소가 뷰포트에 15% 이상 들어오면 `.is-in`을 붙여 한 번 재생한다.
 * 마운트 전에는 `<html>`에 `reveal-ready`가 없어서 요소가 그냥 보이므로 JS가 늦거나 꺼져도 내용이 숨지 않는다.
 * 홈 목록은 브라우저가 데이터를 받은 뒤에 그려지므로(home-slots.tsx) 나중에 붙는 `.reveal`도 지켜본다 —
 * 안 그러면 reveal-ready 때문에 숨은 채로 남는다.
 * UI 없음. 홈 페이지에서만 사용.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const plain = reduceMotion || !("IntersectionObserver" in window);

    const observer = plain
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-in");
                observer?.unobserve(entry.target);
              }
            }
          },
          { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
        );

    function watch(el: HTMLElement) {
      if (observer) observer.observe(el);
      else el.classList.add("is-in");
    }

    document.querySelectorAll<HTMLElement>(".reveal").forEach(watch);
    if (observer) root.classList.add("reveal-ready");

    const added = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".reveal")) watch(node);
          node.querySelectorAll<HTMLElement>(".reveal").forEach(watch);
        });
      }
    });
    added.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer?.disconnect();
      added.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
