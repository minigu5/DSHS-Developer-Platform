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
