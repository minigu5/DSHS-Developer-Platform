// 수정 화면 옆 칸(PosterSheet)을 여닫는 주소 다루기. 칸 상태는 `?poster=list|<포스터 id>` 하나뿐이고,
// Next 가 history.pushState 를 useSearchParams 에 이어 주니 서버를 다시 부르지 않는다(폼에 쓰던 내용도 그대로).
// 연 만큼 기록을 쌓아서 휴대폰 뒤로 가기가 칸을 닫고(수정 화면을 떠나지 않음), 닫기 버튼은 쌓은 만큼 되돌린다.

export const POSTER_PARAM = "poster";
export const POSTER_LIST = "list";

// 이 탭에서 칸 때문에 쌓은 기록 수 — 주소로 바로 들어왔으면 0 이라 닫을 때 기록을 바꿔 쓴다
let pushed = 0;

function hrefWith(value: string | null): string {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(POSTER_PARAM, value);
  else url.searchParams.delete(POSTER_PARAM);
  return url.pathname + url.search + url.hash;
}

/** 목록(기본) 또는 포스터 하나의 만들기 화면을 연다 */
export function openPosterSheet(value: string = POSTER_LIST) {
  window.history.pushState(null, "", hrefWith(value));
  pushed += 1;
}

/** 만들기 화면 → 목록. 목록에서 들어왔으면 뒤로 가기와 같다 */
export function backToPosterList() {
  if (pushed > 1) window.history.back();
  else window.history.replaceState(null, "", hrefWith(POSTER_LIST));
}

export function closePosterSheet() {
  if (pushed > 0) {
    const n = pushed;
    pushed = 0;
    window.history.go(-n);
  } else {
    window.history.replaceState(null, "", hrefWith(null));
  }
}

/** 브라우저 뒤로 가기 — 쌓은 기록 하나가 빠졌다 */
export function notePosterSheetPop() {
  pushed = Math.max(0, pushed - 1);
}
