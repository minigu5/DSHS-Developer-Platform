---
paths:
  - "src/components/haejwo/**"
  - "src/components/announcements/**"
  - "src/app/**/haejwo/**"
  - "src/app/**/announcements/**"
  - "src/lib/haejwo/**"
  - "src/lib/announcements/**"
  - "src/lib/announcement-colors.ts"
  - "src/components/shared/announcement-ticker.tsx"
  - "src/components/shared/markdown*.tsx"
---

# 해줘!·공지사항(개발 팁은 2026-11-17 없앰)

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## ~~📝 개발 팁 블로그~~ — 2026-11-17 없앰
- 사용자 결정(11-17, "개발 팁만 없애자"): `/tips`·작성·수정·상세 화면, `src/components/tips/`, `src/lib/tips/`, 커뮤니티 탭(`CommunityTabs`), `tip-*` 분홍 색 토큰, 홈 "개발 팁" 칸·푸터 링크·프로필 글 목록의 팁을 모두 걷어냈다. `/tips`·`/tips/*`는 `next.config.ts` redirects로 `/haejwo`(임시 302). 내비 "해줘!" 칸은 `/haejwo` 하나로 간다(이름은 "해줘!"·메가폰 아이콘으로 바꿈).
- **DB 삭제**(2단계, migration `20261117110000_drop_tips.sql`): `tips`·`tip_likes`·`tip_comments` DROP + 그 테이블을 쓰던 함수 `admin_content`·`admin_bursts`·`admin_site_stats`·`withdraw_account`를 팁 없이 다시 만들었다. 관리자 대시보드의 팁 항목(현황·최신 글 칩·좋아요 명단·차단 대상)도 제거. 삭제 전 데이터(글 몇 개·댓글·좋아요)는 11-17 세션 임시 폴더에 JSON으로 백업(영구 보관 아님). 처리방침 시행일 2026-11-17(동의 버전은 그대로 — 수집 항목이 줄기만 해서). Cloudinary에 올라간 팁 대표 이미지는 DB에서 주소가 사라져 자동 정리 대상에서 빠진다(고아로 남음).
- 마크다운 렌더 공용 컴포넌트 `src/components/shared/markdown.tsx`는 가이드·해줘·공지가 계속 쓴다 — **브라우저에서만 그린다**(2026-11-01, `next/dynamic` `ssr:false`, 서버 HTML엔 회색 줄 자리). 변환이 서버 CPU를 많이 써서 Workers 무료 한도 503의 원인이었음. 실제 렌더는 `markdown-render.tsx`의 `MarkdownRender` — 빌드 때 그려지는 정적 페이지(`/privacy`)만 직접 쓴다. `table` 계열 커스텀 컴포넌트로 표 스타일 적용(다크 포함). **문서 안 바로가기**(2026-11-04): 제목(h1~h6)에 GitHub과 같은 규칙의 id(`rehypeHeadingIds`, `src/lib/heading-slug.ts`, 같은 제목은 `-1`·`-2`), `#…` 링크는 같은 탭, 제목에 `scroll-mt-20`. **언어 없는 ``` 블록**: `pre`의 `[&>code]:` 클래스로 안쪽 code 스타일을 되돌림.
- 삭제 확인창은 `window.confirm` 대신 shadcn `Dialog`. Supabase join에서 `users` 관계가 모호하면 PGRST201 → FK 이름 명시(`users!ideas_author_id_fkey`).

---

## 💡 해줘! 아이디어 요청 (`/haejwo`)
- **목적**: 비개발자가 아이디어를 올리고 개발자에게 구현을 요청하는 기능. 기능 이름 "해줘".
- **진입점**: 내비 "해줘!" 칸 → `/haejwo` 목록 페이지(2026-11-17부터 탭 없이 바로).
- **목록** `/haejwo`(`revalidate=30`): 카드 그리드(종류·카테고리·상태·작성자·상대시간).
- **위저드** `/haejwo/new` (보호 라우트): 단계별 아이디어 작성.
  - 1단계: 프로그램 종류 선택 (`PROJECT_TYPES` 기반 카드 리스트)
  - 2단계: 카테고리 선택 (`FEATURES` 기반 카드 리스트)
  - 3단계: 아이디어 작성 — 제목 + 마크다운 에디터(작성/미리보기 탭). "해줘! 등록" 버튼으로 제출.
- **상세** `/haejwo/[id]`: 마크다운 렌더 + 종류·카테고리·상태 칩 + 작성자 정보. 작성자에게만 삭제 버튼(`HaejwoOwnerActions`).
- 서버 액션: `src/lib/haejwo/actions.ts`(`createIdea`/`deleteIdea`) — `(nav)` 밖에 위치(Turbopack 바인딩 문제 회피).
- DB 스키마: `docs/10-supabase-haejwo.sql` — `ideas` 테이블 (`id`, `author_id`, `title`, `type`, `category`, `content`, `status`(`open`/`in_progress`/`done`), `linked_project_id`(nullable FK → projects), `created_at`, `updated_at`).
- 컴포넌트: `src/components/haejwo/haejwo-wizard.tsx`, `src/components/haejwo/haejwo-owner-actions.tsx`, `src/components/haejwo/haejwo-complete-button.tsx`.
- **구현완료 흐름**: 로그인된 사용자가 상세 페이지 하단 "구현완료" 버튼 클릭 → 다이얼로그에서 내 프로젝트 목록 표시 → 선택 시 `markIdeaDone(ideaId, projectId)` 서버 액션 호출 → `status='done'`, `linked_project_id` 업데이트 → 완료 후 연결된 프로젝트 카드 노출. **DB도 막는다**(2026-11-12 감사, 트리거 `ideas_guard_linked_project` → `idea_link_not_own`): 글쓴이가 자기 이름(익명 아님)으로 올린 자기 프로젝트만 연결된다(예전엔 정책에 WITH CHECK가 없어 API로 남의 프로젝트도 연결됐음). 연결된 프로젝트를 익명으로 바꾸면 `projects_refresh_anonymous_marks`가 연결을 비운다(anon이 `ideas.author_id`+`linked_project_id`로 주인을 알 수 있었음 — 다시 공개 이름으로 바꿔도 안 돌아옴). 프로젝트 미등록 시 "프로젝트 등록하기" 버튼 제공.
- 색상 포인트: **오렌지** (`orange-700`) — 내비 커뮤니티 칸도 같은 색. 목록 머리 아래 **상태 세그먼트** `HaejwoStatusTabs`(전체·구현 요청 중·완료, `?status=` 링크; `in_progress`는 설정 UI가 없어 세그먼트에 없음). 카드는 `HaejwoCard`(상태 알약·종류 아이콘 칩·카테고리 칩, 완료는 점선 테두리 + 연결 프로젝트 한 줄). 상세는 글 레이아웃(`ArticleHeader` + `ReadingSurface`) + 미완료면 점선 "만들었어요?" 카드, 완료면 emerald 연결 프로젝트 카드.
- ⚠️ 새 환경에서는 `docs/10-supabase-haejwo.sql` → `docs/11-supabase-haejwo-alter.sql` 순서로 Supabase에서 실행해야 함.

---

## 📢 공지사항 (`/announcements`)
- **목적**: 개발자가 프로젝트 홍보, 베타 테스트 모집, 의견 수렴, 업데이트 공지 등을 올리는 게시판.
- **목록** `/announcements`(`revalidate=30`): `PageHero` + 카드 그리드 한 덩어리(고정 공지가 먼저). 카드(`AnnouncementCard`)는 카테고리 알약(`src/lib/announcement-colors.ts` — 티커·상세와 같은 색) + 제목 2줄 + **본문 첫 문단 요약 2줄**(`announcementSummary`, 서버에서 생성해 `summary` prop) + 작성자·시간. **고정 공지는 배경 없이 테두리만 sky** + 오른쪽 끝 핀 "고정".
- **작성** `/announcements/new` (보호 라우트): 카테고리 카드 선택 → 제목 → 마크다운 에디터(작성/분할/미리보기 탭).
- **상세** `/announcements/[id]`(`revalidate=30`): 마크다운 렌더. 작성자·관리자에게만 수정/삭제 버튼 노출. 관리자에게만 "고정/고정해제" 버튼 노출. 상단에 "목록으로" 버튼(`ArrowLeft`) 별도 행으로 배치됨.
- **수정** `/announcements/[id]/edit` (보호 라우트): 작성자 또는 관리자만 접근 가능.
- 댓글 없음. 이미지 없음.
- **카테고리**: `ANNOUNCEMENT_CATEGORIES` — `promotion`(홍보)·`beta`(베타테스트)·`feedback`(의견수렴)·`update`(업데이트)·`general`(일반). `src/lib/constants.ts` 정의.
- **관리자 전용 카테고리**: `ADMIN_ANNOUNCEMENT_CATEGORY` — `admin`(관리자). `src/lib/constants.ts`에 별도 상수로 분리. 에디터(`AnnouncementEditor`)에 `isAdmin` prop이 `true`일 때만 카드가 노출됨. 서버 액션(`actions.ts`)에서도 관리자가 아니면 `admin` 카테고리 저장을 거부. DB `CHECK` 제약에도 `admin` 포함.
- **관리자 고정**: `isDeveloper()` (email=`ts250024@ts.hs.kr`) 체크로 `is_pinned` 토글. 서버 액션 레벨에서도 검증.
- 서버 액션: `src/lib/announcements/actions.ts`(`createAnnouncement`/`updateAnnouncement`/`deleteAnnouncement`/`togglePinAnnouncement`) — `(nav)` 밖에 위치(Turbopack 바인딩 문제 회피).
- 컴포넌트: `src/components/announcements/announcement-card.tsx`, `announcement-editor.tsx`, `announcement-owner-actions.tsx`, `announcement-pin-button.tsx`.
- DB 스키마: `docs/12-supabase-announcements.sql` — `announcements` 테이블 (`id`, `author_id`, `title`, `category`, `content`, `is_pinned`, `created_at`, `updated_at`). `is_admin()` SQL 함수 포함.
- RLS: 조회 누구나, 작성 로그인, 수정/삭제 작성자 또는 관리자.
- 색상 포인트: **스카이블루** (`sky-700`) — 공지 머리 타일·주 버튼·헤더 벨 활성 칩. 입구는 헤더 벨(내비 칸 아님)·홈 티커·푸터 링크.
- ⚠️ 새 환경에서는 `docs/12-supabase-announcements.sql`을 Supabase에서 실행해야 함.
- **공지사항 카드 하단 고정**: `announcement-card.tsx`에서 작성자/시간 영역에 `mt-auto` 적용 — 제목 줄 수에 무관하게 카드 하단에 고정됨.
- **상세 페이지 작성자 링크**: `/announcements/[id]`에서 작성자 아바타+이름 영역을 `<Link href="/developers/[author_id]">` 로 감쌈 — 클릭 시 프로필 페이지 이동.

### 홈 공지사항 티커 (`AnnouncementTicker`)
- 컴포넌트: `src/components/shared/announcement-ticker.tsx` (`"use client"`)
- 홈 페이지(`src/app/page.tsx`) 최상단에 normal flow로 배치 — **스크롤하면 자연히 사라짐** (fixed 아님).
- 위치: `<SiteHeader variant="transparent" />` 다음, `mt-16`(헤더 높이)으로 헤더 아래에 자리잡음.
- 최근 공지사항 최대 10개 fetch (고정 우선, 최신 순). 공지가 0개면 티커 미노출, hero padding도 원래대로 유지.
- CSS-only 무한 스크롤: 아이템을 짝수 세트로 복제 후 `translateX(0) → translateX(-50%)` 루프 (`@keyframes announcement-ticker` in `globals.css`).
- 아이템 수에 따라 duration 자동 조정 (세트당 아이템 수 × 4.5초).
- 디자인: `h-7` 얇은 띠, 불투명 배경(`bg-white`/`dark:bg-zinc-950`), 왼쪽 Bell 아이콘 + 세로 구분선, 좌우 fade-out 그라디언트.
- **접근성**: 우측 일시정지/재생 버튼(`aria-pressed`, 링크 밖에 분리). hover·키보드 포커스 시 자동 정지. `prefers-reduced-motion: reduce`면 애니메이션 없음(정지 버튼도 숨김). 애니메이션은 `.announcement-ticker-track` 클래스(`globals.css`) + `--ticker-duration` 변수.
- **카테고리 pill**: 각 공지 아이템 앞에 `rounded-full` 알약 형태로 카테고리 표시. 카테고리별 은은한 배경색 적용 — promotion=blue, beta=violet, feedback=amber, update=emerald, general=zinc, admin=rose. 배경 투명도 80%(라이트) / 30%(다크)로 subtle하게 유지.
