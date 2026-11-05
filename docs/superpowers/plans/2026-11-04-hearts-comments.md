# 댓글·하트·즐겨찾기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 리뷰를 별점 없는 댓글(1인 여러 개)로 바꾸고, GitHub 별 같은 하트와 그걸로 모이는 즐겨찾기(탐색 맨 위·프로필)를 만든다.

**Architecture:**
- DB는 migration 두 개로 나눈다.
  - A: `reviews`를 `project_comments`로 바꾸고, 익명 가림 칸·트리거와 `project_hearts`를 추가한다. 옛 이름 view `reviews`를 남긴다.
  - B: view와 `rating`을 지우고 `user_id` 읽기 권한을 회수한다.
- 화면 판단 로직(정렬·즐겨찾기 표시·댓글 작성자 표시)은 `src/lib/` 순수 함수로 두고 `node --test`로 검증한다.
- 하트 버튼은 클라이언트 컴포넌트 하나다. 탐색에서는 `ExploreClient`가 상태를 쥐고(제어), 나머지에서는 버튼이 스스로 상태를 쥔다.

**Tech Stack:** Next.js 16 App Router, Supabase(Postgres RLS, PostgREST), Tailwind v4, shadcn base-nova, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-04-hearts-comments-design.md`

## Global Constraints

- 작업은 깨끗한 worktree에서 한다(`superpowers:using-git-worktrees`). 공유 트리에 다른 세션의 미커밋 변경이 있다. 커밋은 내 파일만 `git add`, stash 금지.
- 운영 DB 변경은 `supabase db push`로 직접 한다(사용자 규칙). SQL을 사용자에게 넘기지 않는다.
- 새 정책·함수 규칙:
  - `auth.uid()`·`is_admin()`은 `(select …)`로 감싼다.
  - SECURITY DEFINER 함수는 `SET search_path = ''`이고 이름을 `public.`으로 적는다.
  - 외래 키마다 인덱스를 둔다.
  - 권한 판단에 `public.users.email`을 쓰지 않는다.
- **RLS 정책·트리거 함수에서 `projects.author_id`를 읽으면 anon/authenticated는 권한 오류가 난다**(칸 단위 GRANT). 다른 표에서 `author_id`가 필요하면 SECURITY DEFINER 함수로 감싼다.
- 링크는 `@/components/shared/link`를 쓴다(`next/link` 금지). Button은 `asChild`를 지원하지 않는다.
- `transition-all` 금지. 버튼은 `rounded-full`이고 크기는 주 h-11 / 보조 h-9 / 작은 h-7이다.
- 하트 색은 `TipLikeButton`의 rose를 따른다: 눌림은 `fill-rose-500 text-rose-500`, 알약은 `border-rose-200 bg-rose-50 text-rose-600`.
- 흰 글자 배경에는 `*-500`을 쓰지 않는다.
- 카피는 해요체다. "리뷰"·"별점"은 남기지 않는다. 끝의 기준은 `grep -rn "리뷰\|별점" src --exclude=types.generated.ts --exclude=fragments.generated.ts`가 0줄인 상태다.
- 익명 프로젝트에서 만든 사람이 단 댓글은 `익명 · 만든 사람`으로 표시한다. 상수는 `ANONYMOUS_AUTHOR`(= '익명')를 재사용한다.
- 모바일은 기본 클래스, 데스크탑은 `sm:` 기존값이다. 좌우 여백은 `px-6`이다.

## Review Focus

1. **익명 프로젝트 소유자가 자기 프로젝트에 댓글을 단다.** 남(비로그인 포함)에게는 이름·사진·링크 없이 `익명 · 만든 사람`으로 보여야 한다. anon 키로 REST를 직접 불러도 `user_id`가 나오지 않아야 한다. Task 2 SQL 시험과 Task 1 `commentAuthorView` 테스트로 확인한다.
2. **프로젝트를 개인에서 익명으로 바꾼 뒤** 이전 소유자 댓글이 가려져야 하고, 익명을 풀면 다시 보여야 한다. Task 2 SQL 시험으로 확인한다.
3. **비공개 프로젝트에 하트를 누른 사람의 프로필을 권한 없는 사람이 본다.** 즐겨찾기 띠에도, 하트 수에도 비공개 프로젝트가 나오면 안 된다. Task 2 SQL 시험으로 확인한다.
4. **탐색에서 검색·필터 중** 즐겨찾기 칸이 숨고, 하트 누른 프로젝트가 결과 목록에 그대로 있어야 한다. Task 1 `shouldShowFavorites` 테스트와 Task 5 수동 확인으로 본다.
5. **하트 연타·실패.** 버튼은 처리 중 다시 눌리지 않아야 하고, 실패하면 숫자와 모양이 되돌아가야 한다. 같은 프로젝트가 즐겨찾기 칸과 목록에 동시에 있으면 둘이 같이 바뀌어야 한다. Task 3·5 수동 확인으로 본다.

---

### Task 1: 순수 로직 (하트·댓글 표시·정렬 키)

**Files:**
- Create: `src/lib/hearts.ts`, `src/lib/hearts.test.ts`
- Create: `src/lib/comments.ts`, `src/lib/comments.test.ts`
- Modify: `src/lib/explore-query.ts`(정렬 `'rating'`을 `'hearts'`로), `src/lib/explore-query.test.ts`

**Interfaces:**
- Produces (`src/lib/hearts.ts`, 상대 `.ts` import만):
  - `type HeartCountEmbed = { project_hearts?: { count: number }[] | null }`
  - `heartCountOf(p: HeartCountEmbed): number`. 집계가 없으면 0이다.
  - `favoritesInHeartOrder<T extends { id: string }>(projects: T[], heartedIdsNewestFirst: string[]): T[]`. 하트 순서(최신 먼저)를 따르고, 목록에 없는 id는 버린다.
  - `shouldShowFavorites(query: { q: string; types: string[]; categories: string[]; platforms: string[] }, favoriteCount: number): boolean`
  - `FAVORITES_PREVIEW = 2`
- Produces (`src/lib/comments.ts`):
  - `type CommentRowView = { id: string; content: string; created_at: string; is_author: boolean; public_user_id: string | null; user: { full_name: string | null; nickname: string | null; avatar_url: string | null } | null }`
  - `type CommentAuthorView = { kind: 'anonymous-author' } | { kind: 'user'; userId: string; name: string; avatarUrl: string | null; isAuthor: boolean } | { kind: 'unknown' }`
  - `commentAuthorView(c: CommentRowView): CommentAuthorView`
    - `public_user_id`가 null이고 `is_author`가 true면 `anonymous-author`다.
    - `public_user_id`가 있으면 `user`이고, 이름은 nickname → full_name → '알 수 없음' 순서다.
    - 나머지는 `unknown`이다.
  - `isMyComment(c: CommentRowView, viewerId: string | null, viewerOwnsProject: boolean): boolean`. 참인 조건은 `public_user_id === viewerId`, 또는 `is_author && public_user_id === null && viewerOwnsProject`다.
- Produces: `ExploreSort = 'newest' | 'clicks' | 'hearts'`

- [ ] **Step 1: 실패하는 테스트 작성**

`hearts.test.ts`:
- `heartCountOf({ project_hearts: [{ count: 3 }] }) === 3`, `heartCountOf({}) === 0`, `heartCountOf({ project_hearts: [] }) === 0`
- `favoritesInHeartOrder([{id:'a'},{id:'b'},{id:'c'}], ['c','x','a'])`의 결과 id가 `['c','a']`
- `shouldShowFavorites(빈 쿼리, 1) === true`, `(빈 쿼리, 0) === false`
- `({...빈, q:'게임'}, 3) === false`, `({...빈, platforms:['ios']}, 3) === false`
- 공백만 있는 `q: '  '`는 빈 것으로 본다 → `true`

`comments.test.ts`:
- `{is_author:true, public_user_id:null, user:null}` → `{ kind: 'anonymous-author' }`
- `{is_author:true, public_user_id:'u1', user:{nickname:'민규',...}}` → `{ kind:'user', userId:'u1', name:'민규', isAuthor:true, ... }`
- `{is_author:false, public_user_id:null}` → `{ kind:'unknown' }`
- `isMyComment(익명작성자댓글, 'u1', true) === true`, `isMyComment(익명작성자댓글, 'u1', false) === false`
- `isMyComment({public_user_id:'u1'}, 'u1', false) === true`, `isMyComment(x, null, false) === false`

`explore-query.test.ts`:
- 첫 왕복 테스트의 `sort=rating`을 `sort=hearts`로 바꾼다.
- 새 단언 `parseExploreQuery(new URLSearchParams('sort=rating')).sort === 'newest'`를 넣는다(옛 주소).

- [ ] **Step 2: 실패 확인**: `npm test` → hearts·comments import 실패, explore-query `hearts` 단언 실패.
- [ ] **Step 3: 구현**: 위 시그니처대로 쓴다. `explore-query.ts`의 `SORTS`와 타입을 바꾼다.
- [ ] **Step 4: 통과 확인**: `npm test` → 전부 PASS.
- [ ] **Step 5: 커밋**: `feat(hearts): 하트·댓글 표시 순수 로직, 정렬 키 hearts`

---

### Task 2: migration A + 운영 적용 (옛 코드가 계속 돌게)

**Files:**
- Create: `supabase/migrations/20261104100000_comments_hearts.sql`
- Create (커밋 안 함, scratchpad): `comments_hearts_test.sql`(BEGIN…ROLLBACK 시험), `comments_hearts_revert.sql`(되돌리기)
- Modify: `docs/03-supabase-schema.sql`. 최종 형태(B까지 반영)로 고치고, `reviews` 절을 `project_comments`·`project_hearts`로 바꾼다.

**Interfaces:**
- Produces (DB):
  - `public.project_comments(id, project_id, user_id, content text NOT NULL, created_at, is_author boolean NOT NULL DEFAULT false, public_user_id uuid NULL FK users ON DELETE CASCADE, rating int NULL ← B에서 삭제)`
    - FK 이름 `project_comments_public_user_id_fkey`
    - 인덱스 `(project_id, created_at)`, `(public_user_id)`, 기존 `(user_id)`
  - `public.project_hearts(project_id, user_id, created_at, PK(project_id,user_id))`
    - 인덱스 `(user_id, created_at DESC)`
    - FK 기본 이름 `project_hearts_project_id_fkey`, `project_hearts_user_id_fkey`
  - `public.is_anonymous_owner(p_project uuid, p_user uuid) RETURNS boolean`
    - SECURITY DEFINER, STABLE
    - 반환: `EXISTS(projects WHERE id=p_project AND author_role='anonymous' AND author_id=p_user)`
    - EXECUTE 권한: anon, authenticated
  - view `public.reviews`(옛 코드 호환, B에서 삭제)

순서(한 파일, 한 트랜잭션):
1. `ALTER TABLE reviews RENAME TO project_comments`, `RENAME COLUMN comment TO content`.
   - 제약 `reviews_project_user_key`를 DROP한다.
   - 인덱스 `project_comments_project_created_idx (project_id, created_at)`를 만든다.
   - `reviews_*` 정책 전부(현재 5개로 보임: select_developer·select_when_project_visible·insert_own·update_own·delete_own)를 `ALTER POLICY … RENAME TO project_comments_*`로 바꾼다. 실제 이름은 `select policyname from pg_policies where tablename='reviews'`로 확인한다. 정책식은 OID로 저장돼 있어 이름 변경 후에도 그대로다.
2. `is_author`·`public_user_id` 칸과 FK·인덱스를 추가한다. 기존 행은 `UPDATE … FROM projects`로 채운다(마이그레이션은 소유자 권한이라 `author_id` 읽기 가능).
3. 트리거 함수 `public.project_comments_fill_author()`
   - BEFORE INSERT OR UPDATE, SECURITY DEFINER, `search_path=''`
   - INSERT: `is_author := author_id = NEW.user_id`, `public_user_id := CASE WHEN is_author AND author_role='anonymous' THEN NULL ELSE NEW.user_id END`. 클라이언트 값은 무시한다.
   - UPDATE: `current_user IN ('anon','authenticated')`이고 `user_id`·`project_id`·`is_author`·`public_user_id` 중 하나라도 바뀌면 `RAISE EXCEPTION`이다(`projects_guard_owner`와 같은 모양).
4. 트리거 함수 `public.projects_refresh_comment_authors()`
   - AFTER UPDATE OF author_role ON projects, SECURITY DEFINER
   - 그 프로젝트 댓글의 `public_user_id`를 다시 계산한다. 함수 소유자로 실행되므로 3의 UPDATE 가드에 막히지 않는다.
5. `project_hearts`를 만들고 RLS를 켠다.
   - SELECT 정책 `project_hearts_select`: `user_id = (select auth.uid()) OR (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id) AND NOT public.is_anonymous_owner(project_id, user_id))`
   - SELECT 정책 `project_hearts_select_developer`: `(select public.is_admin())`
   - INSERT 정책: `user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)`
   - DELETE 정책: `user_id = (select auth.uid())`
   - GRANT SELECT, INSERT, DELETE ON project_hearts TO authenticated. GRANT SELECT TO anon.
6. view 만들기:

   ```sql
   CREATE VIEW public.reviews WITH (security_invoker = true) AS
     SELECT id, project_id, user_id, rating, content AS comment, created_at
     FROM public.project_comments;
   ```

   GRANT SELECT ON public.reviews TO anon, authenticated.

- [ ] **Step 1: migration 파일 작성**: 위 순서대로, 파일 머리에 왜/무엇 주석을 단다(`20261031100000_projects_anonymous.sql` 문체).
- [ ] **Step 2: 되돌리기 SQL 작성**: `comments_hearts_revert.sql`에 위 1~6의 역순을 적는다. view와 hearts 삭제, 트리거·함수 삭제, 칸 삭제, 이름 원복, UNIQUE 재생성.
  - UNIQUE는 그사이 생긴 중복 댓글이 있으면 실패한다. 적용 직후에만 쓰는 용도다.
- [ ] **Step 3: 롤백 시험 SQL 작성 후 실행**
  - `comments_hearts_test.sql`은 `BEGIN;` → migration 본문 → 시험 → `ROLLBACK;` 순서다.
  - 시험에서 쓰는 사용자 전환:

    ```sql
    SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","email":"..."}', true);
    ```

  - 실제 사용자·프로젝트 id는 `supabase db query --linked "select …"`로 하나씩 고른다. 비공개 1개, 익명 1개가 필요하며, 없으면 시험 안에서 만든다.
  - 확인할 것(각각 `DO $$ … ASSERT … $$` 또는 결과 눈 확인):
    - (a) 익명 프로젝트 소유자로 댓글 INSERT → `public_user_id IS NULL AND is_author`
    - (b) 남으로 전환 → `SELECT public_user_id, is_author FROM project_comments`는 되고, 그 행에서 소유자 id가 보이지 않음
    - (c) 소유자로 프로젝트 `author_role`을 individual로 UPDATE → 댓글 `public_user_id = 소유자`. 다시 anonymous로 → NULL
    - (d) authenticated로 자기 댓글 `public_user_id` UPDATE 시도 → 예외
    - (e) 소유자가 자기 익명 프로젝트에 하트 → 본인 SELECT 1행, 남 SELECT 0행
    - (f) 비공개 프로젝트에 허용자가 하트 → 권한 없는 사람·anon SELECT 0행
    - (g) anon으로 `SELECT rating, comment FROM reviews LIMIT 1` 성공(옛 코드 호환)
    - (h) 같은 사람이 같은 프로젝트에 댓글 2개 INSERT 성공

  실행: `supabase db query --linked -f <scratchpad>/comments_hearts_test.sql`
  기대: 오류 없이 끝나고 ROLLBACK. 운영에는 변화가 없다.
- [ ] **Step 4: 운영 적용**: `supabase migration list --linked`로 원격에만 있는 migration이 없는지 확인한 뒤 `supabase db push`.
- [ ] **Step 5: 옛 코드가 살아 있는지 즉시 확인**. 운영은 아직 옛 코드다.
  - `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/projects?select=id,reviews(rating)&limit=2" -H "apikey: $ANON"` → 200이고 `reviews` 배열이 있다. 키는 `.env.local`에서 셸 변수로만 읽고 출력하지 않는다.
  - `curl -s https://dshs.dev/explore | grep -c 'projects/'` > 0
  - 하나라도 실패하면 곧바로 `supabase db query --linked -f comments_hearts_revert.sql`을 실행하고 `supabase migration repair --status reverted 20261104100000`을 한다. 그다음 사용자에게 보고하고, 배포 순서를 "코드 먼저"로 바꾼다.
- [ ] **Step 6: 타입 재생성**: `npm run db:types`. 그다음 `src/lib/types.ts`에서 `ReviewRow`를 지우고 `CommentRow = Tables['project_comments']['Row']`, `HeartRow = Tables['project_hearts']['Row']`를 추가한다.
- [ ] **Step 7: 커밋**: `feat(db): 리뷰→댓글 이름 변경, 익명 작성자 가림, 하트 표 (migration A)`. migration·docs/03·types만 커밋한다.

---

### Task 3: 하트 버튼 + 프로젝트 카드

**Files:**
- Create: `src/components/projects/heart-button.tsx`("use client")
- Create: `src/lib/hearts-client.ts`(supabase 쓰기)
- Modify: `src/components/projects/project-card.tsx`
- Modify: `.claude/rules/projects.md`(카드 절)

**Interfaces:**
- Consumes: `heartCountOf`(Task 1)
- Produces:
  - `setHeart(supabase: SupabaseClient, projectId: string, userId: string, on: boolean): Promise<{ error: string | null }>`. 위치는 `src/lib/hearts-client.ts`이고, on이면 insert, off면 delete다. 이미 있음(23505)은 성공으로 본다.
  - `HeartButton` props: `{ projectId: string; viewerId: string | null; count: number; hearted: boolean; onToggle?: (next: boolean) => void; size?: 'card' | 'detail' }`
    - `onToggle`이 있으면 **제어 모드**다. 부모가 상태·쓰기를 맡고, 버튼은 `onToggle(!hearted)`만 부른다.
    - 없으면 자체 모드다. 낙관적 갱신, `setHeart`, 실패 시 되돌림과 `toast.error("하트를 누르지 못했어요.")`를 직접 한다.
    - 처리 중이면 무시한다.
    - `viewerId`가 null이면 `router.push('/login?next=' + encodeURIComponent(pathname + search))`다.
    - `aria-pressed={hearted}`, `aria-label`은 `` `하트 ${count}개${hearted ? ', 누름' : ''}` ``이다.
    - `card`는 h-7 작은 알약(아이콘 3.5 + 숫자 11–12px), `detail`은 h-9 보조 알약이다.
  - `ProjectCardData`
    - 삭제: `reviews?: { rating: number }[] | null`
    - 추가: `project_hearts?: { count: number }[] | null`, `project_comments?: { count: number }[] | null`
  - `ProjectCardProps`에 `heart?: { viewerId: string | null; hearted: boolean; onToggle?: (next: boolean) => void; count?: number }`를 추가한다.
    - `count`가 있으면(제어 모드) 그 값을 쓰고, 없으면 `heartCountOf(project)`를 쓴다.
    - `heart`가 없으면 버튼 없이 숫자만 표시한다(홈 등).

- [ ] **Step 1: `hearts-client.ts`와 `heart-button.tsx` 구현**: `TipLikeButton` 구조를 따르되 초기 하트 여부 조회는 하지 않는다(부모가 넘긴다).
- [ ] **Step 2: 카드 수정**
  - 평균 별점과 `resolveReviewStats`를 지운다.
  - 오른쪽 아래 수치에는 댓글 수(`MessageSquare`, sr-only "댓글", `project_comments[0].count`)만 남긴다.
  - 하트는 카드 오른쪽 위 `absolute top-4 right-4 z-20`에 둔다. 덮개 링크(z-10) 위에 와야 클릭된다.
  - `CardHeader`에 `pr-14`를 줘서 배지 줄과 겹치지 않게 한다.
  - `heart`가 없으면 같은 자리에 숫자만 보이는 비대화형 표시를 둔다(`Heart` 아이콘 + 숫자, 0이면 숨김).
- [ ] **Step 3: 확인**
  - `npx tsc --noEmit`은 이 시점에 카드 사용처에서 `reviews` 관련 오류가 날 수 있고, Task 4~7에서 사라진다. 이 파일들 자체의 오류는 0이어야 한다.
  - `npm test` PASS.
- [ ] **Step 4: 커밋**: `feat(projects): 하트 버튼과 카드 하트 표시`

---

### Task 4: 상세 페이지 — 댓글 + 하트

**Files:**
- Rename: `src/components/projects/project-reviews.tsx` → `project-comments.tsx`, `review-list.tsx` → `comment-list.tsx`, `review-form.tsx` → `comment-form.tsx`
- Modify: `src/app/(nav)/projects/[id]/(detail)/page.tsx`, `src/components/projects/stat-strip.tsx`(문구)
- Modify: `.claude/rules/projects.md`(상세·리뷰 절을 댓글로 다시 쓴다)

**Interfaces:**
- Consumes: `CommentRowView`, `commentAuthorView`, `isMyComment`(Task 1), `HeartButton`(Task 3)
- Produces:
  - `ProjectComments` props: `{ projectId: string; comments: CommentRowView[]; viewerId: string | null; viewerOwnsProject: boolean }`
  - `CommentForm` props: `{ defaultValue?: string; submitLabel: string; onSubmit: (content: string) => Promise<void>; onCancel?: () => void }`. 빈 글은 제출하지 않는다.

- [ ] **Step 1: 상세 페이지 조회 변경**
  - 쿼리:

    ```ts
    supabase.from('project_comments')
      .select('id, content, created_at, is_author, public_user_id, user:users!project_comments_public_user_id_fkey(full_name, nickname, avatar_url)')
      .eq('project_id', id)
      .order('created_at', { ascending: true })
    ```

  - `user_id`는 고르지 않는다(B 이후 권한 오류).
  - 하트 수는 `project_hearts(count)`를 프로젝트 쿼리 embed나 별도 count로 읽는다.
  - 내 하트 여부는 `user`가 있을 때 `project_hearts`를 `eq(project_id).eq(user_id)`로 `maybeSingle` 조회한다.
- [ ] **Step 2: 수치 띠·하트 버튼**
  - `StatStrip`의 별점 칸을 하트 칸으로 바꾼다. 라벨 "하트", 값 숫자, 0이면 `0`, 보조 문구 "아직 아무도 안 눌렀어요"다.
  - 평균 별점 계산을 지운다.
  - 머리 알약 버튼 줄(방문/GitHub/수정)에 `HeartButton size="detail"`(자체 모드)을 추가한다.
- [ ] **Step 3: 댓글 컴포넌트**
  - 제목 "댓글 N"이다.
  - 로그인하면 작성 폼이 항상 보인다. placeholder는 "써 본 느낌이나 궁금한 점을 남겨 주세요", 버튼은 "댓글 남기기"다.
  - 비로그인은 "댓글을 남기려면 로그인이 필요해요" + 로그인 버튼이다.
  - insert는 `{ project_id, user_id: viewerId, content }`이다. `.select()`를 붙이지 않는다.
  - 목록은 오래된 것이 위다. 작성자 표시는 `commentAuthorView`로 한다.
    - `anonymous-author`: 회색 원 아바타 + `익명 · 만든 사람`, 링크 없음
    - `user`: 아바타 + 이름(`/developers/<userId>` 링크), `isAuthor`면 이름 옆 작은 "만든 사람" 배지(zinc 알약)
  - 수정·삭제 메뉴는 `isMyComment(c, viewerId, viewerOwnsProject)`일 때만 보인다. 수정은 기존 Dialog 재사용("댓글 수정"), 삭제 확인은 `window.confirm` 대신 shadcn `Dialog`("이 댓글을 지울까요?")다.
  - 토스트는 "댓글을 남겼어요"/"댓글을 고쳤어요"/"댓글을 지웠어요", 실패는 "…하지 못했어요"다.
  - `viewerOwnsProject`는 페이지의 기존 `isOwner`를 넘긴다.
- [ ] **Step 4: 확인**
  - `npx tsc --noEmit`(상세 관련 0)
  - dev 서버에서 본인 프로젝트, 남 프로젝트, 비로그인으로 댓글 2개 작성, 수정, 삭제, 하트 토글
  - 익명 프로젝트에 소유자로 댓글을 달고 다른 계정이나 비로그인으로 보면 `익명 · 만든 사람`
  - 스크린샷은 `/tmp`에 둔다.
- [ ] **Step 5: 커밋**: `feat(projects): 리뷰를 별점 없는 댓글로, 상세 하트`

---

### Task 5: 탐색 — 즐겨찾기 칸 + 하트순

**Files:**
- Modify: `src/app/(nav)/explore/page.tsx`, `src/components/explore/explore-client.tsx`, `src/components/explore/mobile-filter-bar.tsx`(정렬 라벨이 있으면)
- Create: `src/components/explore/favorites-section.tsx`
- Modify: `.claude/rules/explore.md`

**Interfaces:**
- Consumes: `heartCountOf`, `favoritesInHeartOrder`, `shouldShowFavorites`, `FAVORITES_PREVIEW`(Task 1), `setHeart`(Task 3), `ProjectCard` `heart` prop(Task 3)
- Produces: `ExploreClient` props에 `viewerId: string | null`, `myHeartIds: string[]`(최신 하트 먼저)를 추가한다.

- [ ] **Step 1: 서버 페이지**
  - `PROJECT_SELECT`의 `reviews(rating)`을 `project_hearts(count), project_comments(count)`로 바꾼다.
  - `user`가 있으면 `supabase.from('project_hearts').select('project_id').eq('user_id', user.id).order('created_at', { ascending: false })`로 id 목록을 넘긴다. 개발자 계정도 사용자 클라이언트로 조회한다.
- [ ] **Step 2: ExploreClient 상태**
  - `hearts: Record<string, { hearted: boolean; count: number }>` 초기값은 `initialProjects`와 `myHeartIds`에서 만든다.
  - `heartOrder: string[]`는 `myHeartIds`로 시작한다. 새로 누르면 맨 앞에 넣고, 취소하면 뺀다.
  - `toggleHeart(id, next)`: 낙관적 갱신 → `setHeart` → 실패 시 되돌리고 토스트.
  - 같은 id가 칸과 목록 양쪽에 있어도 상태가 하나라 같이 바뀐다.
  - 칸에서 하트를 취소하면 카드가 즉시 칸에서 빠진다.
- [ ] **Step 3: 정렬**: `hearts`는 `hearts[id].count` 내림차순이고, 같으면 서버 순서(최신)다. 라벨 "하트순"은 데스크탑 드롭다운과 모바일 바 모두에 둔다.
- [ ] **Step 4: `FavoritesSection`**
  - props: `{ projects: ProjectCardData[]; renderCard: (p) => ReactNode }`
  - 결과 줄 위, 목록과 같은 열 폭에 둔다. 제목 `즐겨찾기 N`(Plex, 목록 섹션 제목과 같은 급)이다.
  - 처음 `FAVORITES_PREVIEW`장만 보인다. 그 아래 "N개 더 보기"/"접기" 보조 알약(h-9, `aria-expanded`)을 둔다.
  - 아래 목록과 `border-b` 또는 간격으로 구분한다.
  - `shouldShowFavorites(현재 쿼리, 개수)`가 false면 렌더하지 않는다.
- [ ] **Step 5: 확인**: dev에서 아래를 본다.
  - 로그인 + 하트 0개 → 칸 없음
  - 하트 3개 → 2장 + "1개 더 보기"
  - 검색어 입력 → 칸 숨김, 목록에 하트 카드 있음
  - 목록에서 하트 → 칸에 즉시 맨 앞으로 추가
  - 비로그인 하트 → 로그인으로 이동 후 `next`로 복귀
  - 모바일 폭 375px 스크린샷(`/tmp`)
  - `?sort=rating` → 최신순
- [ ] **Step 6: 커밋**: `feat(explore): 맨 위 즐겨찾기 칸과 하트순 정렬`

---

### Task 6: 프로필 — 즐겨찾기한 프로젝트 띠

**Files:**
- Modify: `src/app/(nav)/developers/[id]/page.tsx`
- Modify: `.claude/rules/profile.md`

**Interfaces:**
- Consumes: `ProjectCard` `heart` prop(자체 모드, Task 3)

- [ ] **Step 1: 조회**
  - 프로젝트 select의 `reviews(rating)`을 `project_hearts(count), project_comments(count)`로 바꾼다.
  - 즐겨찾기 쿼리:

    ```ts
    supabase.from('project_hearts')
      .select(`created_at, projects!inner(<카드 칸 + project_hearts(count), project_comments(count) + users!projects_public_author_id_fkey(*)>)`)
      .eq('user_id', id)
      .order('created_at', { ascending: false })
    ```

  - RLS가 볼 수 없는 프로젝트를 거른다.
  - 보는 사람의 하트 여부는 `viewer`가 있을 때, 화면의 모든 카드 id에 대해 `project_hearts.select('project_id').eq('user_id', viewer.id).in('project_id', ids)` 한 번으로 구한다.
- [ ] **Step 2: 띠**
  - 기존 프로젝트 띠 아래에 같은 모양(`bg-zinc-50 dark:bg-zinc-900/40` + `border-t`)으로 "즐겨찾기한 프로젝트 N"을 둔다. 카드 격자도 같다.
  - 0개면 남의 프로필에서는 띠를 숨긴다. 본인 프로필에서는 "마음에 드는 프로젝트에 하트를 누르면 여기에 모여요" + `/explore` 링크를 보인다.
- [ ] **Step 3: 확인**
  - 다른 계정·비로그인으로 내 프로필 → 띠가 보이고, 비공개(권한 없음)·내 익명 프로젝트는 안 보인다.
  - 본인으로 보면 내 익명 프로젝트 하트도 보인다(본인 SELECT).
- [ ] **Step 4: 커밋**: `feat(profile): 즐겨찾기한 프로젝트 띠`

---

### Task 7: 홈·문구·처리방침 정리

**Files:**
- Modify: `src/components/home/home-data.ts`, `src/components/home/how-it-works.tsx`, `src/components/home/home-project-card.tsx`(별점 표시가 있으면), `src/components/home/site-footer.tsx`, `src/app/page.tsx`, `src/app/(nav)/projects/new/page.tsx`, `src/components/projects/project-form.tsx`, `src/components/privacy/withdraw-button.tsx`, `src/content/guides/register.md`, `src/lib/privacy/policy.ts`
- Modify: `.claude/rules/home.md`, `.claude/rules/privacy.md`, `.claude/rules/guide.md`(필요 시), `CLAUDE.md`(DB 스키마 절: `reviews`를 `project_comments`·`project_hearts`로, 익명 절에 댓글 가림 한 줄)

- [ ] **Step 1: 홈 데이터**
  - 최근 프로젝트 select의 `reviews(rating)`을 `project_hearts(count), project_comments(count)`로 바꾼다.
  - 최근 리뷰 쿼리를 `from('project_comments').select('content, is_author, public_user_id, user:users!project_comments_public_user_id_fkey(nickname, full_name), projects!inner(title, icon_url)')`로 바꾼다.
  - `latestReview`는 `latestComment: { content; authorName; projectTitle; projectIcon }`이다. 이름은 `commentAuthorView` 기준이고, 익명 작성자면 `익명 · 만든 사람`이다.
  - 별 표시를 지운다.
- [ ] **Step 2: 문구**
  - "이렇게 써요" 본문은 "친구가 만든 프로그램을 써 보고 하트를 누르거나 댓글을 남겨요. 만든 사람에게 가장 큰 피드백이에요."로 한다.
  - 나머지 파일의 "리뷰"는 "댓글"로 바꾸고, "별점"은 문장에서 뺀다.
- [ ] **Step 3: 가이드 조각**: `register.md`를 고친다. 그다음 `supabase db query --linked "select key from guide_… where key like '%register%'"`로 위키에 수정본이 있는지 본다. 테이블 이름은 `src/lib/guide-wiki`에서 확인한다. 있으면 사용자에게 보고하고 위키 화면에서 고치도록 남긴다(DB 직접 수정 금지).
- [ ] **Step 4: 처리방침** `policy.ts`
  - 수집 표 "리뷰·별점" → "댓글·하트(즐겨찾기)"
  - 공개 범위 문단 "…공개로 올린 프로젝트·팁·리뷰·댓글" → "…팁·댓글, 하트를 누른 프로젝트 목록"
  - 탈퇴 문단 "리뷰"를 바꾼다.
  - `PRIVACY_EFFECTIVE_DATE`를 배포일로 바꾼다.
  - `npm test`로 `format.test.ts`가 PASS인지 본다.
- [ ] **Step 5: 확인**
  - `grep -rn "리뷰\|별점" src --exclude=types.generated.ts --exclude=fragments.generated.ts` → 0줄
  - `grep -rn "reviews\|rating" src --exclude=types.generated.ts` → 0줄. 단 `src/components/guide-wiki/**`의 무관한 단어(review 단계 등)는 예외로 보고한다.
  - `npx tsc --noEmit` → 0
  - `npm test` PASS
- [ ] **Step 6: 커밋**: `feat: 홈·문구·처리방침을 댓글·하트로`

---

### Task 8: 배포 → migration B → 마무리

**Files:**
- Create: `supabase/migrations/20261104110000_comments_hearts_cleanup.sql`
- Modify: `src/lib/types.generated.ts`(재생성), 메모리 `project-hearts-comments.md`

- [ ] **Step 1: 빌드 확인**: `npm run build` 성공. 가능하면 `npx opennextjs-cloudflare build`도 확인한다(`docs/19` 참고).
- [ ] **Step 2: 사용자에게 main 푸시 확인을 받는다**(사용자 규칙: 푸시 전 확인). 승인되면 worktree에서 `git push origin HEAD:main`을 한다. Workers Builds 배포가 끝나면 dshs.dev에서 상세, 탐색, 홈, 프로필을 확인한다. 댓글 작성과 하트까지 실제로 해 본다.
- [ ] **Step 3: migration B 작성**
  - `DROP VIEW public.reviews;`
  - `ALTER TABLE public.project_comments DROP COLUMN rating;`. CHECK도 같이 사라진다.
  - `REVOKE SELECT ON public.project_comments FROM anon, authenticated; GRANT SELECT (id, project_id, content, created_at, is_author, public_user_id) ON public.project_comments TO anon, authenticated;`
  - 롤백 시험(`BEGIN; <B>; SET LOCAL ROLE anon; SELECT user_id FROM project_comments LIMIT 1;` → 권한 오류 기대 `; ROLLBACK;`)을 `supabase db query --linked -f`로 실행한다. 그다음 `supabase db push`.
- [ ] **Step 4: 사후 확인**
  - anon REST `project_comments?select=user_id` → 401/42501
  - `select=id,content,public_user_id` → 200
  - 운영 상세 페이지에서 댓글이 보이고 작성할 수 있음
- [ ] **Step 5: 타입 재생성**(`npm run db:types`), `npx tsc --noEmit` 0, 커밋 `chore(db): 옛 reviews view·rating 삭제, 댓글 user_id 읽기 막기 (migration B)` 후 푸시(같은 승인 범위).
- [ ] **Step 6: 메모리 갱신**: 배포 커밋 해시와 "팔로잉은 `project_hearts (user_id, created_at DESC)` 인덱스로 피드 가능"을 적는다.
