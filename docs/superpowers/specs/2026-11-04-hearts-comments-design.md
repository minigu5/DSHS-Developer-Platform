# 리뷰 → 댓글, 별점 → 하트·즐겨찾기 설계

- 날짜: 2026-11-04
- 상태: 사용자 승인 대기 (검토자 확인 반영)

## 왜

사용자 관찰: **별점 때문에 리뷰를 잘 안 쓴다.** 점수를 매기는 부담이 있어서 한마디 남기기를 망설인다.
그래서 점수를 없애고, 가볍게 쓰는 "댓글"과 GitHub 별 같은 "하트"로 바꾼다.
하트를 누른 프로젝트는 "즐겨찾기"가 되어 탐색 맨 위와 프로필에 모인다.

## 목표

1. 화면 어디에도 "리뷰"·"별점"이 남지 않는다. 이름은 전부 **댓글**이다.
2. 한 사람이 한 프로젝트에 **댓글을 여러 개** 달 수 있다(만든 사람과 대화하듯).
3. 프로젝트마다 **하트**를 1인 1번 누르고 다시 누르면 취소한다. 하트 수는 모두에게 보인다.
4. 탐색(`/explore`) 맨 위에 내 **즐겨찾기** 칸이 따로 나온다.
5. 프로필(`/developers/[id]`)에 **즐겨찾기한 프로젝트** 띠가 나온다. 모두에게 공개한다.

## 하지 않는 것

- 답글(들여쓰기 스레드), 댓글 좋아요, 하트 알림.
- 즐겨찾기 숨기기 설정. 사용자 결정: 공개로 하고 설정은 만들지 않는다.
- 팔로잉. 나중 계획이며 아래 「팔로잉 대비」만 지킨다.

## 이러면 실패(동작해도 안 됨)

- **익명 프로젝트의 만든 사람이 드러난다.** 특히 아래 "만든 사람" 표시로 드러나면 안 된다.
- **비공개 프로젝트가 남의 즐겨찾기 목록이나 하트 수를 통해 볼 권한 없는 사람에게 보인다.**
- 탐색에서 검색·필터를 했는데 하트 누른 프로젝트가 결과에서 빠진다.
- 기존 리뷰 글이 사라진다.

## 사용자가 정한 것

### 댓글
- "리뷰"를 모든 화면에서 "댓글"로 바꾼다. 상세, 카드, 홈 "이렇게 써요", 수치 띠, 토스트, 빈 상태 문구를 포함한다.
- 별점을 **완전히** 없앤다. 대상은 별 고르는 칸, 카드 평균 별점, 상세 수치 띠의 별점 칸, 탐색 "별점순", DB `rating` 칸이다.
- 지금 리뷰는 모두 글이 있다(`comment NOT NULL`). 별점만 빠지고 글은 댓글로 그대로 남긴다.
- 1인 1개 제한(`reviews_project_user_key` UNIQUE)을 푼다.

### 하트
- 프로젝트 카드와 상세 페이지에 하트 버튼과 숫자를 둔다. 누르면 바로 채워진다(낙관적 갱신, 실패하면 되돌림).
- 로그인하지 않았으면 `/login?next=<현재 경로>`로 보낸다.
- **누가 무엇에 하트를 눌렀는지는 공개다.** 근거는 GitHub 별처럼 공개라는 점, 그리고 나중 팔로잉 피드와 이어진다는 점이다.

### 탐색 맨 위 즐겨찾기
- 로그인했고 하트가 1개 이상일 때만 보인다. 검색창 아래, 전체 목록 위에 있다.
- 기존 `ProjectCard`를 쓴다. 사용자는 작은 타일보다 카드를 원했다.
- 처음엔 카드 한 줄(데스크탑 2장)만 보인다. 그 아래 "N개 더 보기" 버튼을 누르면 나머지가 펼쳐진다. 모바일도 처음엔 2장이다.
- 제목은 "즐겨찾기 N" 형식이다.
- **검색어나 필터가 있으면 숨긴다.**
- **하트 누른 프로젝트도 아래 전체 목록에 그대로 나온다.** 카드 하트가 채워져 있어서 구별된다.
- 정렬 "별점순"을 **"하트순"**으로 바꾼다.

### 프로필
- 기존 프로젝트 띠 아래에 "즐겨찾기한 프로젝트 N" 띠를 둔다. 카드는 `ProjectCard`이고, 하트를 누른 순서대로 최신이 앞에 온다.
- 모두에게 보인다. 보는 사람이 볼 권한이 있는 프로젝트만 나온다(RLS).

### 개인정보 처리방침
- `src/lib/privacy/policy.ts`의 "리뷰·별점"을 "댓글·하트(즐겨찾기)"로 바꾼다. 공개 범위 문단에 "하트를 누른 프로젝트 목록"을 추가하고, 탈퇴 문단의 "리뷰"를 바꾼다.
- 본문이 바뀌면 전원에게 동의 창이 다시 뜬다. 사용자도 알고 동의했다.
- 시행일 `PRIVACY_EFFECTIVE_DATE`를 배포일로 바꾼다.

## 정해진 구조 (내 판단, 바꾸려면 근거 필요)

### DB (migration 새로 하나, `supabase db push`로 운영 적용 — 사용자 규칙)
- **`reviews` 표 이름을 `project_comments`로 바꾼다.** 칸 `comment`는 `content`로 바꿔 `tip_comments`와 맞춘다.
  - `rating` 칸을 지우고 CHECK도 지운다.
  - UNIQUE를 지운다. 그 UNIQUE가 `project_id` 외래 키 인덱스를 겸했으므로 `(project_id, created_at)` 인덱스를 새로 만든다.
  - 정책 4개(조회는 `EXISTS (SELECT 1 FROM projects WHERE id = project_id)`, 쓰기는 본인)는 표를 따라간다. 정책 이름만 `project_comments_*`로 바꾼다.
  - 개발자 계정 조회 정책 `reviews_select_developer`도 같이 옮긴다.
  - `docs/03-supabase-schema.sql` 통합본도 같이 고친다.
- **새 표 `project_hearts`**: `project_id`(FK projects ON DELETE CASCADE), `user_id`(FK users ON DELETE CASCADE), `created_at timestamptz DEFAULT now()`, PK(`project_id`, `user_id`). 인덱스는 `(user_id, created_at DESC)`다. 즐겨찾기 목록과 나중 팔로잉 피드에 쓴다.
  - RLS SELECT: `EXISTS (SELECT 1 FROM public.projects WHERE id = project_id)`. projects RLS에 맡기므로 비공개는 권한자에게만 보인다. 개발자 계정 정책도 댓글과 같은 방식이다.
  - INSERT: `(select auth.uid()) = user_id` 그리고 위 EXISTS. 볼 수 없는 프로젝트에는 하트를 못 누른다.
  - DELETE: 본인만. UPDATE 정책은 없다.
  - 자기 프로젝트에 하트를 누르는 것은 허용한다(GitHub과 같다).
  - CLAUDE.md 「DB 정리」 규칙을 따른다: `auth.uid()`는 `(select …)`로 감싸고, 외래 키마다 인덱스를 둔다.
- 탈퇴(`withdraw_account`)는 users CASCADE로 댓글·하트가 지워진다. 함수 수정은 필요 없을 것으로 보이며, builder가 확인한다.
- 하트 수는 따로 칸을 두지 않는다. PostgREST 집계 `project_hearts(count)`로 읽는다(팁의 `tip_likes(count)`와 같은 방식).
  - 이유: 칸을 두면 트리거, 잠금 칸, GRANT가 늘어난다. 익명 프로젝트 규칙상 projects 새 칸에는 GRANT가 필수다.

### 익명 보호
- 댓글의 **"만든 사람" 표시**는 `project.author_role !== 'anonymous'`이고 댓글 쓴 사람이 `public_author_id`와 같을 때만 붙인다. 팀 프로젝트는 소유자에게만 붙인다(팀원 이메일→id 매칭은 하지 않는다).
- 즐겨찾기 카드에 나오는 익명 프로젝트는 지금처럼 '익명'으로 보인다(`public_author_id` 사용). 하트를 누른 사람이 드러나는 것은 의도된 공개다.
- **(내 판단) 만든 사람이 자기 익명 프로젝트에 누른 하트는 남에게 안 보인다.** 그대로 두면 그 사람의 공개 즐겨찾기 목록에 익명 프로젝트가 떠서 만든 사람이 추정된다. 그래서 hearts SELECT 정책을 이렇게 바꾼다.
  - `user_id = (select auth.uid())`이면 본다.
  - 그 밖에는 `EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND NOT (p.author_role = 'anonymous' AND p.author_id = user_id))`일 때만 본다.
  - 정책은 `author_id` 칸 권한과 상관없이 평가된다. 이 점은 익명 migration 정책과 같은 전제다.
  - 남이 보는 하트 수는 1 적게 나온다. 받아들인다.
- **익명 프로젝트에 만든 사람이 단 댓글은 "익명 · 만든 사람"으로 보인다**(사용자 결정, 2026-11-04). 닉네임·사진·프로필 링크를 붙이지 않는다. 화면만 가리지 않고 **DB에서 막는다** — 익명 프로젝트와 같은 방식.
  - `project_comments`에 `is_author boolean`(댓글 쓴 사람 = 프로젝트 `author_id`)과 `public_user_id uuid`(FK users, `is_author`이고 프로젝트가 익명이면 NULL, 아니면 `user_id`)를 둔다. 다른 표를 봐야 해서 자동 계산 칸이 아니라 트리거로 채운다.
    - BEFORE INSERT(project_comments): 두 칸을 계산한다. 클라이언트가 보낸 값은 덮어쓴다.
    - AFTER UPDATE OF author_role(projects): 그 프로젝트 댓글의 `public_user_id`를 다시 계산한다(익명으로 바꾸면 가려지고, 풀면 보인다).
    - `user_id`·`project_id`·`is_author`·`public_user_id`는 anon/authenticated가 UPDATE로 못 바꾼다(`lock_identity_columns`와 같은 방식).
  - `project_comments.user_id`는 anon/authenticated가 **읽을 수 없다**(칸 단위 GRANT, `select('*')` 금지 — 칸을 적어 읽는다). 화면은 `public_user_id`로만 사람을 붙인다: `users!project_comments_public_user_id_fkey(...)`.
  - "만든 사람" 표시는 `is_author`로. 익명 프로젝트여도 표시한다(이름 없이 "익명 · 만든 사람").
  - 내 댓글 수정·삭제 버튼: `user_id`를 못 읽으므로 `public_user_id = 나`, 또는 `is_author`이고 내 프로젝트(`rpc('my_project_ids')`)인 경우로 판정한다. 권한은 RLS(`user_id = auth.uid()`)가 최종 판단.
  - 기존 행은 migration에서 채운다(지금 익명 프로젝트에 만든 사람이 쓴 리뷰도 가려진다).
  - 칸 권한 회수(REVOKE `user_id`)는 **migration B**에서 한다 — A 직후 옛 코드가 view로 `user_id`를 읽기 때문. 그 몇 분은 지금과 같은 노출이라 받아들인다.

### 팔로잉 대비
- 하트를 (누가, 무엇을, 언제)로 남긴다. `(user_id, created_at DESC)` 인덱스가 있으면 "팔로우한 사람들이 최근 하트를 누른 프로젝트"를 바로 만들 수 있다. 이번에는 이것만 한다.

## 화면별 바뀌는 곳 (찾은 위치)

- 상세 `src/app/(nav)/projects/[id]/(detail)/page.tsx`
  - 리뷰 조회를 댓글 조회로 바꾼다.
  - 수치 띠 `StatStrip`의 별점 칸을 하트 칸("하트 N", 0이면 0)으로 바꾼다.
  - 제목 근처에 하트 버튼을 둔다. 위치는 builder가 정하되 주 버튼 줄과 어울려야 한다.
- 댓글 `src/components/projects/project-reviews.tsx`·`review-list.tsx`·`review-form.tsx`
  - `project-comments`·`comment-list`·`comment-form`으로 이름을 바꾸고 별 UI를 지운다.
  - 작성 폼은 로그인하면 항상 보인다. "이미 남겼어요" 분기를 없앤다.
  - 목록은 시간순(오래된 것 위)이다. 글 스레드처럼 읽히게 하려는 내 판단이다.
  - 삭제 확인은 `window.confirm` 대신 shadcn `Dialog`로 한다(팁 댓글과 같게). 버튼 "댓글 남기기"다.
- 카드 `src/components/projects/project-card.tsx`
  - 평균 별점을 하트 수로 바꾸고, 댓글 수(`MessageSquare`)는 남긴다.
  - 하트 버튼은 카드 오른쪽 위에 둔다. 카드 전체가 링크라서 버튼은 링크 밖(형제 요소, `absolute`)에 두어야 한다. 버튼 안 버튼, 링크 안 버튼은 금지다.
  - 내가 눌렀는지(`hearted`)는 prop으로 받는다.
  - 홈 카드(`home-project-card.tsx`)는 숫자만 보이고 버튼은 없다. builder가 판단한다.
- 탐색 `src/app/(nav)/explore/page.tsx`·`src/components/explore/explore-client.tsx`·`src/lib/explore-query.ts`
  - `reviews(rating)`을 `project_hearts(count), project_comments(count)`로 바꾼다.
  - 로그인 사용자의 하트 id 목록을 함께 받는다.
  - 즐겨찾기 칸을 추가한다. 정렬 키 `rating`을 `hearts`로 바꾼다. 옛 `?sort=rating` 주소는 기본값으로 떨어진다(모르는 값은 버리는 기존 동작).
  - `explore-query.test.ts`를 고친다.
- 프로필 `src/app/(nav)/developers/[id]/page.tsx`: 프로젝트 조회의 `reviews(rating)`을 바꾸고 즐겨찾기 띠를 추가한다.
- 홈 `src/components/home/home-data.ts`·`how-it-works.tsx`·카드
  - 최근 프로젝트의 별점을 하트 수로 바꾼다.
  - "이렇게 써요"의 최근 리뷰 예시를 최근 댓글로 바꾸고 별 표시를 지운다.
  - 문구 "별점이나 한마디를 남겨요"를 하트·댓글 문구로 바꾼다.
- 하트 버튼 모양은 `TipLikeButton`(`src/components/tips/tip-like-button.tsx`)의 rose 알약을 따른다. 공용 하트 버튼으로 뽑을지는 builder가 정한다.
- 타입: `src/lib/types.ts`(수동)의 Review를 Comment로 바꾸고 Heart를 추가한다. `types.generated.ts`는 다시 만든다.
- "리뷰"·"별점" 글자가 있는 파일(2026-11-04 grep, 전부 고친다): 위 파일들, `src/app/(nav)/projects/new/page.tsx`, `src/app/page.tsx`, `src/components/home/site-footer.tsx`, `src/components/privacy/withdraw-button.tsx`, `src/components/projects/project-form.tsx`, `src/components/projects/stat-strip.tsx`, `src/content/guides/register.md`(가이드 조각 — 위키에 수정본이 있으면 DB 쪽 최신본도 확인), `src/lib/privacy/policy.ts`. 정의상 "끝"은 `grep -rn "리뷰\|별점" src`(generated 제외)가 0줄인 상태다.
- 하트가 걸린 프로젝트가 비공개로 바뀌면 하트는 지우지 않는다. RLS가 권한 없는 사람에게 숨긴다.
- 문서: CLAUDE.md DB 스키마 절, `.claude/rules/projects.md`(리뷰 절·수치 띠·카드), `explore.md`, `profile.md`, `home.md`, `privacy.md`.

## 배포 순서 주의

표 이름과 칸이 바뀌므로, **옛 코드가 돌고 있는 동안 migration을 먼저 적용하면 상세·탐색·홈이 깨진다.** main 푸시는 Workers Builds로 자동 배포된다.

(내 판단) migration을 **두 개로 나눠 읽기는 끊기지 않게** 한다.

1. **migration A** (코드 배포 전 `db push`)
   - 표 이름을 바꾸고 `comment`를 `content`로 바꾼다. UNIQUE를 지우고 인덱스를 만든다. 정책 이름을 바꾸고 `project_hearts`를 만든다.
   - 옛 이름 view `reviews`를 만든다. 정의는 `SELECT id, project_id, user_id, rating, content AS comment, created_at FROM project_comments`이고 `security_invoker = true`로 RLS가 그대로 걸리게 한다. `rating` 칸은 아직 지우지 않는다.
   - 옛 코드의 읽기(`reviews(rating)` 집계 포함)는 그대로 동작한다. 쓰기는 몇 분 실패할 수 있으며 받아들인다.
   - PostgREST가 view와 표 사이 관계를 추론하는지는 builder가 먼저 확인한다. 안 되면 이 단계를 바꾼다.
2. 새 코드 main 푸시 → 자동 배포 확인.
3. **migration B**: view `reviews`를 지우고 `rating` 칸과 CHECK를 지운다.

## builder에게 맡김

- 컴포넌트 파일 구조, 하트 버튼 공용화, 즐겨찾기 칸 세부 간격·빈 상태.
- 탐색의 내 하트 목록을 서버에서 줄지 브라우저에서 읽을지. CPU 규칙상 공개 데이터 표시는 브라우저 쪽을 선호한다.
- 홈 카드 하트 버튼 유무.
- 배포 순서의 구체 방법(위 주의 지키기).
