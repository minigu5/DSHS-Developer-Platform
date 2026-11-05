// 탐색에서 프로젝트를 열었다가 상세의 "← 모든 프로젝트"를 누르면 브라우저 뒤로 가기처럼 돌아가게 한다
// (새로 /explore로 가면 맨 위부터 다시 보여서 보던 자리를 잃었다 — 2026-11-05 사용자 요청).
// 탐색에서 카드를 누를 때 목적지를 적어 두고, 상세에 도착하면 그 기록 칸(history.state)에 표시를 남긴다.
// 표시는 기록 칸마다 따로라, 다른 데를 갔다가 브라우저로 이 상세에 돌아와도 바로 앞이 탐색인지 맞게 안다.

const PENDING_KEY = "explore-return";
const STATE_KEY = "__dshsFromExplore";

/** 탐색에서 프로젝트 링크를 누른 순간 — 목적지 경로를 적어 둔다 */
export function markLeavingExplore(pathname: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, pathname);
  } catch {
    // 저장소를 못 쓰면 그냥 새로 /explore로 간다
  }
}

/** 상세에 도착했을 때 — 탐색에서 바로 온 거면 이 기록 칸에 표시하고 true */
export function claimArrivalFromExplore(pathname: string): boolean {
  try {
    if (sessionStorage.getItem(PENDING_KEY) !== pathname) return false;
    sessionStorage.removeItem(PENDING_KEY);
    // __NA 등 Next 내부 값을 그대로 둬야 Next가 이 기록 칸을 계속 다룬다
    window.history.replaceState({ ...window.history.state, [STATE_KEY]: true }, "");
    return true;
  } catch {
    return false;
  }
}

/** 지금 기록 칸 바로 앞이 탐색인지(브라우저로 이 상세에 다시 돌아온 경우 포함) */
export function cameFromExplore(): boolean {
  return window.history.state?.[STATE_KEY] === true;
}
