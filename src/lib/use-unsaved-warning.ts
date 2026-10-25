"use client";

import { useCallback, useEffect, useRef } from "react";

const LEAVE_MESSAGE = "저장하지 않은 내용이 있어요. 이 페이지를 나갈까요?";

/**
 * 저장 안 한 변경(`dirty`)이 있을 때 다른 곳으로 가려 하면 브라우저 경고를 띄운다.
 * - 새로고침·탭 닫기·바깥 사이트 이동: `beforeunload` (브라우저 기본 경고)
 * - 사이트 안 링크(헤더·로고 등 클라이언트 이동): `beforeunload`가 안 떠서 클릭을 가로채 `confirm`
 * 뒤로 가기(popstate)는 막지 않는다.
 * 저장·삭제처럼 코드로 직접 떠날 때는 이동 직전에 반환된 `allowLeave()`를 부른다.
 */
export function useUnsavedWarning(dirty: boolean) {
  const bypassRef = useRef(false);

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (bypassRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }

    function onClick(e: MouseEvent) {
      if (bypassRef.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const next = new URL(anchor.href, window.location.href);
      // 바깥 사이트·mailto 등은 beforeunload가 맡는다 (여기서도 물으면 두 번 뜸).
      if (next.origin !== window.location.origin) return;
      // 같은 페이지 안 이동(해시)은 떠나는 게 아니다.
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;

      if (window.confirm(LEAVE_MESSAGE)) {
        // 일반 링크라 진짜 새로 불러오는 경우에 beforeunload가 또 묻지 않게.
        bypassRef.current = true;
      } else {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    // 캡처 단계: Next `Link`의 onClick보다 먼저 걸러야 클라이언트 이동을 막을 수 있다.
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const allowLeave = useCallback(() => {
    bypassRef.current = true;
  }, []);

  return { allowLeave };
}
