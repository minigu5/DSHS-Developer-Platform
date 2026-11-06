---
paths:
  - "src/components/explore/**"
  - "src/app/**/explore/**"
  - "src/lib/explore-query*.ts"
  - "src/lib/type-icons.ts"
---

# 탐색/검색

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## 🔎 탐색/검색 (`/explore`)
- `src/components/explore/explore-client.tsx`: 클라이언트 측 필터링.
- **검색어·필터·정렬은 주소에 남는다**(2026-11-01 사용자 요청 — 새로고침하면 다 풀리던 것): `?q=&type=&category=&platform=&sort=`(여러 값은 쉼표, 기본값은 안 씀). 변환은 `src/lib/explore-query.ts`(테스트 `explore-query.test.ts`, 모르는 값은 버림). 서버 페이지가 `searchParams`를 읽어 첫 화면부터 거른 목록을 그리고(`force-dynamic`이라 캐시 손해 없음), `ExploreClient`가 바뀔 때 300ms 모았다 `history.replaceState`(기록 안 쌓음, Safari 30초 100회 제한 때문에 묶음). 링크 공유·뒤로 가기에도 같은 결과.
- 검색 대상: 프로젝트 제목·설명·태그(`features`) + **작성자 닉네임·실명·팀 이름**.
- **머리(2026-10-24 톤 통일)**: `PageHero`(section=explore, `maxWidth="lg"`) 안에 큰 검색창(`rounded-full`, 최대 640px)이 들어간다 — 이 페이지의 히어로. 검색창은 `ExploreClient`가 렌더(상태 공유).
- **사이드바 필터** (데스크탑, `md:` 이상): **프로그램 종류 → 카테고리 → 플랫폼** 접이식 3그룹(다중 선택). 체크박스 없이 아이콘+라벨 토글 버튼으로 구성. 선택 시 파란 배경+파란 텍스트로 강조. 컨테이너는 `max-w-6xl`(사이드바 224px + 카드 **최대 2열**).
  - `aside` 자체에 `sticky top-24 self-start` 적용 — `self-start`가 없으면 flex 컨테이너 높이를 따라 늘어나 필터 적용 시 프로젝트 수가 줄어들 때 사이드바 위치가 흔들리는 버그 발생.
  - 아이콘 매핑은 `src/lib/type-icons.ts`(`TYPE_ICONS`·`PLATFORM_ICONS`·`CATEGORY_ICONS`) — 해줘 카드·등록 폼·위저드와 공유.
- **모바일 필터**(`src/components/explore/mobile-filter-bar.tsx`): 머리 아래 `sticky` 가로 스크롤 바 — [종류 ▾][카테고리 ▾][플랫폼 ▾] 드롭다운 알약 + 선택된 값은 파란 칩(× 해제) + 오른쪽 정렬. 드롭다운은 `absolute top-full` 패널(바깥 클릭·Esc로 닫힘, `aria-expanded`). 결과 줄은 "N개 · 필터 적용" + 정렬(데스크탑).
- 헤더 우측 버튼은 제거됨 — 전역 `PageNav`로 이동.
- 로그인 페이지(`/login`) 뒤로가기 링크는 `/`가 아닌 `/explore`로 이동.
- **즐겨찾기만 필터·하트순**(2026-11-05 하트 도입, 2026-11-06 칸→필터): 서버 페이지가 `project_hearts(count), project_comments(id)`와 내 하트 id를 넘기고, `ExploreClient`가 하트 상태(`hearts`) 하나를 쥔다(카드는 제어 모드 `heart.onToggle`). 처음엔 목록 맨 위에 늘 뜨는 "즐겨찾기" 칸이었는데 사용자가 "모든 프로젝트에서 즐겨찾기가 위에 뜨니까 별로"라고 해서 **켤 때만 거르는 필터**로 바꿨다 — 데스크탑 사이드바 맨 위 "즐겨찾기만" 토글, 모바일 필터 바 맨 앞 "즐겨찾기" 알약(둘 다 로그인했을 때만). 주소 `?fav=1`(비로그인이면 무시), 다른 필터와 AND, "필터 초기화"에 포함. 켠 상태에서 하트를 취소하면 그 카드는 바로 빠진다. 하트 누른 게 없으면 빈 상태 문구가 하트를 눌러 보라고 안내. 정렬 `?sort=hearts`("하트순", 같은 수면 최신순), 옛 `?sort=rating`은 최신순으로.
