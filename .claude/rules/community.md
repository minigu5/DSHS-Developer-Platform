---
paths:
  - "src/components/tips/**"
  - "src/components/haejwo/**"
  - "src/components/announcements/**"
  - "src/components/community/**"
  - "src/app/**/tips/**"
  - "src/app/**/haejwo/**"
  - "src/app/**/announcements/**"
  - "src/lib/tips/**"
  - "src/lib/haejwo/**"
  - "src/lib/announcements/**"
  - "src/lib/announcement-colors.ts"
  - "src/components/shared/announcement-ticker.tsx"
  - "src/components/shared/markdown*.tsx"
---

# 개발 팁·해줘!·공지사항

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## 📝 개발 팁 블로그 (`/tips`)
- **목록** `/tips`(`revalidate=30`): 카드 그리드(커버·태그·작성자·좋아요/댓글 수·상대시간). 머리 버튼은 "팁 작성" 하나, 머리 아래 도구줄에 커뮤니티 탭(개발 팁 | 해줘!) + 팁 개수.
- **작성** `/tips/new` · **수정** `/tips/[id]/edit`: 페이지는 `PageHero variant="compact"`(타일 + 제목만). `TipEditor`(`src/components/tips/tip-editor.tsx`) — 카드 2장: ① 큰 밑줄 제목 입력(`TITLE_INPUT_CLASS`) + 2열(한 줄 요약/태그) + 대표 이미지, ② 본문(`EditorTabs` 작성/분할/미리보기, Tab 들여쓰기). 제출 버튼은 섹션 색(`SECTION_COLORS.tips.button`) "팁 발행"/"저장". 둘 다 보호 라우트(미들웨어). 수정은 작성자만. 공지 작성(`AnnouncementEditor`)도 같은 틀 — 카드 ① 맨 위에 카테고리 카드 선택(단일 선택이라 sky 유지).
- **상세** `/tips/[id]`(`revalidate=30`): 글 레이아웃 — `ArticleHeader`("← 개발 팁" 줄 + 태그 + h1 + 요약 + 작성자 줄) → 커버 16:9 → `ReadingSurface`(마크다운, 하단에 `TipLikeButton` 알약 + "도움이 됐다면 눌러 주세요") → `TipComments`(카드 없이 "댓글 N" 제목 + 행 목록). 작성자에게만 수정/삭제 노출(`TipOwnerActions`). 팁·해줘·공지 상세가 같은 틀을 쓴다.
- 서버 액션: **`src/lib/tips/actions.ts`**(`createTip`/`updateTip`/`deleteTip`). 라우트 그룹 밖에 위치 — `(nav)` 경로에 두면 Turbopack에서 client→server action 바인딩이 깨지는 문제 있음.
- 팁 작성 필수 필드: 제목, **한 줄 요약(최대 30자)**, **대표 이미지 (파일 업로드 또는 URL)**, 본문.
- 삭제 확인창은 `window.confirm` 대신 shadcn `Dialog` 컴포넌트 사용(팁 삭제·댓글 삭제 모두).
- Supabase join 시 `users` 테이블 관계가 모호하면 PGRST201 오류 발생 → `author:users!tips_author_id_fkey(...)` 처럼 **FK 이름을 명시**해야 함.
- 마크다운 렌더 공용 컴포넌트: `src/components/shared/markdown.tsx`(팁·가이드 공유) — **브라우저에서만 그린다**(2026-11-01, `next/dynamic` `ssr:false`, 서버 HTML엔 회색 줄 자리). 변환이 서버 CPU를 많이 써서(팁 상세 24→10ms) Workers 무료 한도 503의 원인이었음. 실제 렌더는 `markdown-render.tsx`의 `MarkdownRender` — 빌드 때 그려지는 정적 페이지(`/privacy`)만 직접 쓴다. `table`/`thead`/`tbody`/`tr`/`th`/`td` 커스텀 컴포넌트로 표 테두리·구분선·헤더 배경 스타일 적용(다크모드 포함). 바깥 테두리는 `rounded-xl` 컨테이너로 감싸 오버플로우 처리.
- **상세 페이지 작성자 링크**: `/tips/[id]`에서 작성자 아바타+이름 영역을 `<Link href="/developers/[author_id]">` 로 감쌈 — 클릭 시 프로필 페이지 이동.

### 팁(블로그) 테이블 — `docs/08-supabase-tips.sql`
- **`tips`**: `id`, `author_id`, `title`, `summary`, `content`(마크다운), `cover_url`, `tags[]`, `created_at`, `updated_at`(트리거 자동 갱신).
- **`tip_likes`**: `tip_id`, `user_id`, `created_at`, PK(`tip_id`,`user_id`) — 좋아요 1인 1회.
- **`tip_comments`**: `id`, `tip_id`, `user_id`, `content`, `created_at`.
- RLS: 모두 조회는 누구나, 생성은 로그인, 수정/삭제는 본인만. (좋아요는 수정 없음)
- ⚠️ 새 환경에서는 이 SQL을 Supabase에서 실행해야 함.

---

## 💡 해줘! 아이디어 요청 (`/haejwo`)
- **목적**: 비개발자가 아이디어를 올리고 개발자에게 구현을 요청하는 기능. 기능 이름 "해줘".
- **진입점**: 내비 "커뮤니티" 칸 → 커뮤니티 탭(`CommunityTabs`)의 "해줘!" 탭 → `/haejwo` 목록 페이지. (개발 팁 머리의 "해줘! 둘러보기" 버튼은 2026-10-24 제거)
- **목록** `/haejwo`(`revalidate=30`): 카드 그리드(종류·카테고리·상태·작성자·상대시간).
- **위저드** `/haejwo/new` (보호 라우트): 단계별 아이디어 작성.
  - 1단계: 프로그램 종류 선택 (`PROJECT_TYPES` 기반 카드 리스트)
  - 2단계: 카테고리 선택 (`FEATURES` 기반 카드 리스트)
  - 3단계: 아이디어 작성 — 제목 + 마크다운 에디터(작성/미리보기 탭). "해줘! 등록" 버튼으로 제출.
- **상세** `/haejwo/[id]`: 마크다운 렌더 + 종류·카테고리·상태 칩 + 작성자 정보. 작성자에게만 삭제 버튼(`HaejwoOwnerActions`).
- 서버 액션: `src/lib/haejwo/actions.ts`(`createIdea`/`deleteIdea`) — `(nav)` 밖에 위치(Turbopack 바인딩 문제 회피).
- DB 스키마: `docs/10-supabase-haejwo.sql` — `ideas` 테이블 (`id`, `author_id`, `title`, `type`, `category`, `content`, `status`(`open`/`in_progress`/`done`), `linked_project_id`(nullable FK → projects), `created_at`, `updated_at`).
- 컴포넌트: `src/components/haejwo/haejwo-wizard.tsx`, `src/components/haejwo/haejwo-owner-actions.tsx`, `src/components/haejwo/haejwo-complete-button.tsx`.
- **구현완료 흐름**: 로그인된 사용자가 상세 페이지 하단 "구현완료" 버튼 클릭 → 다이얼로그에서 내 프로젝트 목록 표시 → 선택 시 `markIdeaDone(ideaId, projectId)` 서버 액션 호출 → `status='done'`, `linked_project_id` 업데이트 → 완료 후 연결된 프로젝트 카드 노출. 프로젝트 미등록 시 "프로젝트 등록하기" 버튼 제공.
- 색상 포인트: **오렌지** (`orange-700`) — 개발 팁(`tip-*` 분홍)과 구별. 목록 도구줄 오른쪽(커뮤니티 탭 옆) **상태 세그먼트** `HaejwoStatusTabs`(전체·구현 요청 중·완료, `?status=` 링크; `in_progress`는 설정 UI가 없어 세그먼트에 없음). 카드는 `HaejwoCard`(상태 알약·종류 아이콘 칩·카테고리 칩, 완료는 점선 테두리 + 연결 프로젝트 한 줄). 상세는 글 레이아웃(`ArticleHeader` + `ReadingSurface`) + 미완료면 점선 "만들었어요?" 카드, 완료면 emerald 연결 프로젝트 카드.
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
