"use client";

// 빠른 프로젝트 상세(2026-11-06 사용자 요청) — 목록에서 프로젝트를 누르면 dshs.dev 서버를 거치지 않고 브라우저가 Supabase(서울)에서 바로 받아 그린다.
// dshs.dev 는 한국 통신사가 LA 로 보내 왕복만 1~2초라(서버 DB 작업은 0.1초 남짓), 서버 페이지를 브라우저용으로 바꾸는 것만으론 안 빨라졌다.
// 주소창만 history.pushState 로 /projects/<id> 로 바꾸고(Next 가 usePathname 과 맞춰 준다), 원래 페이지는 숨겨 둔 채 위에 상세를 그린다.
// 뒤로 가기 = 상세가 닫히고 원래 페이지가 스크롤·필터 그대로. 새로 고침·주소 직접 입력·새 탭은 평소처럼 서버 페이지.
// 관리자(익명 주인 보기에 서비스 키)·못 찾음·오류는 router.refresh()로 서버 페이지를 불러온다 — 서버 페이지의 QuickViewRealPage 가 이 화면을 닫는다.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isDeveloper } from "@/lib/constants";
import { isRedirectHost, type DomainHost } from "@/lib/domains/hosts";
import {
  loadProjectDetail,
  type DetailViewer,
  type ProjectDetail,
} from "@/lib/projects/detail";
import { ProjectDetailView } from "@/components/projects/project-detail-view";
import { ProjectDetailSkeleton } from "@/components/shared/page-skeleton";

const PROJECT_PATH =
  /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

// ── 지금 열린 상세(페이지마다 하나라 모듈 변수로 둔다) ──
type Opened = { id: string; from: string; scrollY: number };
let opened: Opened | null = null;
const listeners = new Set<() => void>();
function setOpened(next: Opened | null) {
  opened = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function openQuickView(id: string) {
  setOpened({
    id,
    from: window.location.pathname + window.location.search,
    scrollY: window.scrollY,
  });
  window.history.pushState(null, "", `/projects/${id}`);
}

// ── 데이터 — 누르기 시작할 때(pointerdown) 미리 받기 시작해 클릭 때 이어 쓴다 ──
type Loaded =
  | {
      kind: "ok";
      detail: ProjectDetail;
      viewer: DetailViewer;
      liveDomain: { name: string; redirect: boolean } | null;
    }
  | { kind: "server" };

const pending = new Map<string, { at: number; promise: Promise<Loaded> }>();

async function fetchQuickView(id: string): Promise<Loaded> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    const viewer: DetailViewer = user
      ? { id: user.id, email: user.email ?? null }
      : null;
    // 관리자는 서버 페이지(익명 프로젝트 주인·비공개 프로젝트를 서비스 키로)
    if (isDeveloper(viewer?.email)) return { kind: "server" };
    const [detail, domain] = await Promise.all([
      loadProjectDetail({ data: supabase, self: supabase }, id, viewer),
      supabase
        .rpc("project_live_domain", { p_project_id: id })
        .then(({ data }) => data?.[0] ?? null),
    ]);
    if (!detail) return { kind: "server" };
    return {
      kind: "ok",
      detail,
      viewer,
      liveDomain: domain
        ? {
            name: domain.name,
            redirect: isRedirectHost(domain.host as DomainHost),
          }
        : null,
    };
  } catch {
    return { kind: "server" };
  }
}

function prefetchQuickView(id: string) {
  const hit = pending.get(id);
  if (hit && Date.now() - hit.at < 10_000) return;
  pending.set(id, { at: Date.now(), promise: fetchQuickView(id) });
}

/** 미리 받아 둔 게 있으면 그걸(한 번만), 없으면 새로 — 다시 열 때 하트·댓글이 옛 값이지 않게 */
function takeQuickView(id: string): Promise<Loaded> {
  const hit = pending.get(id);
  pending.delete(id);
  if (hit && Date.now() - hit.at < 10_000) return hit.promise;
  return fetchQuickView(id);
}

function quickTargetOf(e: MouseEvent | PointerEvent): string | null {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return null;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return null;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download"))
    return null;
  const url = new URL(a.href);
  if (url.origin !== window.location.origin || url.search || url.hash)
    return null;
  if (url.pathname === window.location.pathname) return null;
  return PROJECT_PATH.exec(url.pathname)?.[1] ?? null;
}

/**
 * 페이지 내용을 감싼다 — (nav) 레이아웃과 홈. 프로젝트 링크 클릭을 가로채고, 열린 동안 children 은 숨긴 채로 둔다(상태·스크롤 유지).
 */
export function QuickViewHost({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const current = useSyncExternalStore(
    subscribe,
    () => opened,
    () => null,
  );
  const active = !!current && pathname === `/projects/${current.id}`;

  useEffect(() => {
    // window 캡처 단계 — React(Next Link)의 onClick 보다 먼저 막는다. Link 는 defaultPrevented 면 이동하지 않는다
    function onPointerDown(e: PointerEvent) {
      const id = quickTargetOf(e);
      if (id) prefetchQuickView(id);
    }
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      const id = quickTargetOf(e);
      if (!id) return;
      e.preventDefault();
      openQuickView(id);
    }
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  // 열면 맨 위로, 닫혀서 원래 페이지로 돌아오면 보던 자리로
  const wasActive = useRef(false);
  useLayoutEffect(() => {
    if (active && !wasActive.current) window.scrollTo(0, 0);
    if (
      !active &&
      wasActive.current &&
      current &&
      window.location.pathname + window.location.search === current.from
    ) {
      window.scrollTo(0, current.scrollY);
    }
    wasActive.current = active;
  }, [active, current]);

  return (
    <>
      <div className={active ? "hidden" : "contents"}>{children}</div>
      {active && current && (
        <QuickProjectDetail
          key={current.id}
          id={current.id}
          from={current.from}
        />
      )}
    </>
  );
}

/** 서버가 그린 상세 페이지에 넣는다 — router.refresh() 등으로 진짜 페이지가 오면 빠른 상세를 닫는다 */
export function QuickViewRealPage() {
  useEffect(() => {
    if (opened) setOpened(null);
  }, []);
  return null;
}

function QuickProjectDetail({ id, from }: { id: string; from: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let alive = true;
    takeQuickView(id).then((r) => {
      if (alive) setLoaded(r);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  // 서버 페이지가 필요하면 지금 주소(/projects/<id>)를 서버에서 다시 받는다. 받는 동안은 뼈대, 다 받으면 이 화면을 닫아 서버가 그린 것(상세·없는 페이지)을 보인다
  const [refreshing, startRefresh] = useTransition();
  const askedServer = useRef(false);
  useEffect(() => {
    if (loaded?.kind !== "server" || askedServer.current) return;
    askedServer.current = true;
    startRefresh(() => router.refresh());
  }, [loaded, router]);
  useEffect(() => {
    if (askedServer.current && !refreshing) setOpened(null);
  }, [refreshing]);

  // 누른 링크는 숨겨져 포커스가 사라지므로 상세로 옮긴다(키보드·화면 읽기 사용자)
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={box} tabIndex={-1} className="focus:outline-none">
      {!loaded || loaded.kind === "server" ? (
        <ProjectDetailSkeleton />
      ) : (
        <ProjectDetailView
          detail={loaded.detail}
          viewerId={loaded.viewer?.id ?? null}
          isAdmin={false}
          liveDomain={loaded.liveDomain}
          anonymousOwner={null}
          back={
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1 rounded-sm text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {from.startsWith("/explore") ? "모든 프로젝트" : "뒤로"}
            </button>
          }
          onCommentsChanged={() => {
            fetchQuickView(id).then(setLoaded);
          }}
        />
      )}
    </div>
  );
}
