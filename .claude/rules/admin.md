---
paths:
  - "src/app/(nav)/admin/**"
  - "src/components/admin/**"
  - "src/lib/admin/**"
  - "src/components/shared/banned-notice.tsx"
  - "supabase/migrations/*admin*"
  - "docs/24-supabase-admin-verify.sql"
---

# 관리자 대시보드 `/admin` (2026-11-05)

설계 `docs/superpowers/specs/2026-11-05-admin-dashboard-design.md`, 계획 `docs/superpowers/plans/2026-11-05-admin-dashboard.md`. 계기: Jakal Office가 10초 안에 6번 등록됐고(폼 버그, `.claude/rules/projects.md` 「중복 등록 막기」) 관리자가 하나씩 들어가 지워야 했다.

- **사용자 결정**: 하루 한 번 열어 "무슨 일이 있었나 / 확인할 게 있나"를 보고, 문제가 있으면 **버튼을 최소로** 눌러 대응. 비속어는 최신순으로 **확인**(자동 차단 아님). 차단은 **기간을 정해서(1일·7일·30일·무제한)** 하고 **등록만 막는다**(로그인·열람·하트·내 글 삭제는 그대로). 처리방침 재동의는 하트·댓글 작업과 묶어 한 번만 띄우려 했으나 하트·댓글이 먼저 배포됨 — 배포 전 사용자 확인.
- **설계 판단(사용자 OK)**: 익명 작성자를 차단해도 목록엔 '익명 작성자', 기존 글 수정·프로필 닉네임/소개 변경도 차단, 탈퇴 후 재가입 우회 방지(이메일 해시 + 끝나는 날만 보관), 관리자 삭제는 확인 창 한 번(이름 입력 없음).
- **권한**: 페이지는 `getUser()` + `isDeveloper()`(아니면 `notFound()`, 비로그인은 로그인으로 — 미들웨어 보호 라우트). 액션(`src/lib/admin/actions.ts`)은 매번 `requireAdmin()`(`guard.ts`) 후 서비스 키, `admin_actions`에 기록(지운 글 내용은 안 남김). 프로필 메뉴(`auth-buttons.tsx`)에 관리자만 "관리자" 링크. `/domains/admin`은 `/admin#domains`로 보낸다.
- **화면 순서**: 오늘 확인할 것 → 사이트 현황 → 최신 글 → 차단 → 주소 관리(`AdminDomainTable` 재사용). 섹션 색 `admin`(rose). `main`은 `grid-cols-[minmax(0,1fr)]` — 없으면 넓은 표 때문에 모바일 가로 스크롤.
  - **오늘 확인할 것**(`buildTodayItems`, `src/lib/admin/today.ts`, 순서 고정): 비속어 걸린 글 → 몰아 올린 것(같은 작성자·종류가 앞 글과 10분 이내로 3개 이상 이어짐, "하나만 남기고 지우기") → 위키 큰 삭제(지운 글자 − 더한 글자 ≥ 300, 최신 버전일 때만 "되돌리기") → 끊긴 주소("주소 회수") → 최근 2일 안에 끝난 차단("다시 차단"). "확인함"은 `admin_dismissals(kind, item_id)`에 남아 다시 안 뜬다(키 = `${kind}:${대상 id}`, 몰아 올리기는 가장 먼저 올린 글 id). 최근 50개 글·2일 범위만 본다.
  - **최신 글**: 프로젝트·프로젝트 댓글·팁·팁 댓글·해줘·위키 수정·프로필(닉네임/소개 변경, `users.profile_updated_at`) 최신순 50개씩, 종류 칩(`feed-filters.ts`), 비속어는 `<mark>` 빨갛게. 줄마다 지우기(프로필은 닉네임·소개만 비움, 위키는 지우기 없음)·작성자 차단·원래 페이지.
- **비속어** `src/lib/admin/profanity.ts`(테스트 있음): 공백·점·별표·숫자 등 끼움 문자를 지운 문자열에서 찾고 위치는 원문 기준. 예외 목록(`시발점`·`미시발`·`등신대`·`씨발라`…)에 들어가면 버린다. 표시만 하고 등록은 막지 않는다.
- **DB**(migration `20261106100000_admin_bans`·`20261106110000_admin_dashboard_rpc`·`20261106120000_admin_actions_forget_user`·`20261106130000_admin_review_fixes`, 모두 운영 적용, 검증 `docs/24-supabase-admin-verify.sql` — 항상 롤백, "VERIFY OK"):
  - `user_bans(user_id, email_hash, until NULL=무제한, reason, from_anonymous, created_by)`·`admin_dismissals`·`admin_actions` — RLS 켜고 정책 없음(서비스 키 전용).
  - 판정은 `private.is_banned(uid)`(user_id 또는 `auth.users` 이메일 해시, DEFINER) — **API로 안 열리는 `private` 스키마**에 둔다. `public`에 두고 authenticated에 열면 누구나 `/rpc/is_banned`로 남의 차단 여부를 알 수 있었다(리뷰 지적). `public.is_banned`는 service_role 전용(서버 `banNoticeFor`). `my_ban()`(본인 안내용), `email_hash(text)`(내장 `sha256`).
  - **쓰기 가드** `guard_banned_writes`(INVOKER — `current_user`로 사용자 키를 가려야 해서. DEFINER로 바꾸면 UPDATE 검사가 영영 안 돈다): INSERT는 로그인한 사람 또는 행 주인 칸(`TG_ARGV[0]`)이 차단 중이면 `user_banned`(42501) — 주인 칸 검사가 서비스 키로 대신 쓰는 위키 저장·주소 예약까지 막는다. UPDATE는 사용자 키일 때만(관리자·서비스 키 수정 통과). 트리거 이름 `zz_ban_guard`(같은 표 다른 BEFORE 트리거 뒤): projects·project_comments·tips·tip_comments·ideas·announcements(INSERT/UPDATE — 공지는 로그인한 누구나 쓸 수 있다), guide_revisions·subdomains(INSERT). `users`는 `zz_profile_guard` — 닉네임·소개가 실제로 바뀔 때만 검사(로그인 upsert가 같은 값을 다시 써도 통과, **비어 있던 닉네임을 처음 정하는 것도 통과** — 막으면 재가입자·닉네임을 지운 사람이 온보딩에 갇힌다)하고 `profile_updated_at` 갱신. **새 사용자 글 표를 만들면 `zz_ban_guard`도 붙일 것.**
  - 읽기 함수(service_role 전용): `admin_content`(모든 글 한 모양)·`admin_recent_content(p_kinds, p_before, p_limit)`·`admin_bursts`·`admin_guide_shrinks`·`admin_bans`·`admin_site_stats`(KST 경계). 익명 프로젝트·가려진 댓글은 `authorName` NULL, `authorId`는 채워서 넘기고 **서버(`read.ts` `stripAuthor`, 차단 목록은 `toBanView`)가 화면으로 보낼 때 뺀다** — 차단은 서버가 글 id로 작성자를 다시 찾는다(`authorOf`).
  - 탈퇴(`withdraw_account`): 끝난 차단은 지우고, 차단 중이면 이유·건 사람을 지우고 해시·끝나는 날만 남김(user_id는 FK SET NULL). `users` 삭제 트리거가 `admin_actions`의 그 사람 id를 지운다. 끝난 탈퇴자 기록은 대시보드를 열 때 파기(`loadAdminDashboard`).
- **차단된 사람 화면**: `useMyBan()`(`my_ban` RPC) + `BannedNotice`("○월 ○일 ○시까지 글을 쓸 수 없어요." / 무제한 "관리자가 풀 때까지…") — 프로젝트 등록·수정, 프로젝트 댓글, 팁·팁 댓글, 해줘, 공지, 위키 편집기는 버튼도 잠근다. 해시로만 걸린 재가입자도 끝나는 날을 맞게 보여 준다(`latestBanUntil`). DB 거절 오류는 `friendlyWriteError`로 같은 문구. 서비스 키로 쓰는 위키 저장·주소 받기는 서버에서 `banNoticeFor`로 먼저 막는다(문구용).
- **한계**: 이름을 바꿔 가며 올리는 도배·목록에 없는 욕은 최신 글을 직접 훑어야 한다. 사용자 신고·글 숨기기(프로젝트는 비공개 전환 액션 `adminMakeProjectPrivate`만 있음, 화면 버튼은 아직 없음)·운영 지표(Workers 503·Actions 실패)는 없다.
