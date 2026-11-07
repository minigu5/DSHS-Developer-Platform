# 포스터 자리·걸기·홍보 길 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 주인이 AI 포스터나 직접 만든 포스터 그림 중 하나를 상세 페이지에 걸고, 다른 학생은 그 포스터를 눌러 크게 보다가 "내 프로젝트로도 만들기"로 넘어오게 한 뒤, AI 포스터를 학생 모두에게 연다.

**Architecture:** 포스터는 지금처럼 `project_posters`(서비스 키 전용)에 두고 `kind`(`ai`/`upload`)로 나눈다. 걸린 포스터는 anon 키로 읽혀야 하므로(빠른 상세) `projects`에 표시용 칸(`poster_image_url`·`poster_is_ai`)을 두고 projects RLS에 맡긴다. 걸기·내리기·올리기는 서버가 `getBandAccess`로 권한을 확인한 뒤 서비스 키로 쓴다. AI 포스터를 걸 땐 지금 내보내기와 같은 Browser Rendering으로 PNG를 찍어 Cloudinary에 올린다.

**Tech Stack:** Next.js 16 App Router, Supabase(PostgreSQL·RLS·migration 자동 적용), Cloudflare Workers(OpenNext), Cloudinary REST, Cloudflare Browser Rendering REST, `node --test`(순수 로직).

**Spec:** `docs/superpowers/specs/2026-11-07-poster-placement-promo-design.md`

## Global Constraints

- hover 확대·떠오름 금지(`hover:scale-*`, `hover:-translate-y-*`), `transition-all` 금지 — 포스터도 예외 아님(사용자 결정). 누르면 커진다.
- 탭 분할(한 메뉴 안 "A | B" 세그먼트) 금지. 메뉴 칸은 5칸 그대로.
- 포스터 개수: AI + 직접 올림 **합쳐서 프로젝트당 5개**(`POSTER_LIMITS.perProject = 5`, DB `poster_limit`도 5). "새 포스터 하루 1개"(`poster_daily`)는 `kind = 'ai'`만.
- 걸린 포스터는 `visibility === 'public'`일 때만 보인다(비공개 허용 사용자에게도 안 보임). 비공개로 바뀌어도 지우지 않는다.
- 직접 올리기: PNG·JPEG·WebP만(매직 넘버 `sniffImageType`), 10MB까지, Cloudinary `dshs/posters`, 띠 합성 안 함.
- projects에 새 칸 → migration에 `GRANT SELECT (칸) ON public.projects TO anon, authenticated` + `PROJECT_COLUMNS`에 추가. 사용자 키로는 못 바꾸게 `projects_guard_owner` 확장.
- 새 RLS·함수: `search_path` 고정(SECURITY DEFINER는 `''`), `auth.uid()`는 `(select …)`.
- 쿠키 인증 Route Handler는 `isSameOrigin()` 필수. 링크는 `@/components/shared/link`.
- 문구는 해요체 한국어, 로딩은 `…`.
- 처리방침 본문 변경 = 배포 즉시 전원 재동의. **main 푸시(배포) 시점은 사용자가 정한다.**
- migration(Task 1)은 코드보다 **먼저 따로** main에 푸시한다(푸시하면 Supabase가 운영에 자동 적용 — 같은 푸시에 넣으면 코드가 없는 칸을 읽는 순간이 생길 수 있음). 푸시 전 사용자 확인.
- 이 계획은 공유 작업 트리가 아니라 **새 worktree 브랜치**에서 한다(`superpowers:using-git-worktrees`). `git stash` 금지, 커밋은 내 파일만 `add`.

## Review Focus

1. **그림 그리는 중인 AI 포스터를 걸기** → 걸기 버튼이 꺼져 있고 서버도 거절해야 한다(그림 없는 PNG가 걸리면 안 됨). Task 2 `canHangPoster` 테스트.
2. **걸린 포스터를 지움** → 상세에서 즉시 사라져야 한다(`projects.poster_*` 비움). Task 1 SQL 검증.
3. **공개 → 비공개 전환, 또는 비공개 허용 사용자가 상세를 봄** → 포스터가 안 보여야 한다. Task 2 `showcaseVisible` 테스트.
4. **이미지 아닌 파일(확장자만 .png인 HTML)을 올림** → 415로 거절, 행이 생기면 안 된다. Task 4 단계에 수동 확인 + 기존 `sniffImageType` 테스트.
5. **등록 폼에서 포스터 파일을 골랐는데 올리기만 실패** → 프로젝트는 등록돼 있고, 사용자에게 "포스터는 포스터 화면에서 다시 올려 주세요"라고 알린 뒤 상세로 간다(다시 누르면 중복 등록). Task 8 수동 확인.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `supabase/migrations/20261107120000_poster_hang.sql` (새) | `kind`·`image_url`, projects 표시 칸·잠금·비우기 트리거, 개수 5 |
| `src/lib/posters/hang-logic.ts` (새) + `.test.ts` | 걸기 가능·오래됨·표시·권유·시작 경로 판단(순수) |
| `src/lib/nav-active.ts` (새) + `.test.ts` | 메뉴 활성 판정(`page-nav.tsx`에서 옮김) |
| `src/lib/posters/render.ts` (새) | Browser Rendering 호출을 내보내기·걸기가 같이 씀 |
| `src/lib/cloudinary-delete.ts` (새) | Cloudinary 최선 노력 삭제(탈퇴·프로젝트 삭제·다시 걸기 공용) |
| `src/lib/posters/hang.ts` (새, `'use server'`) | `hangPoster`·`unhangPoster` |
| `src/app/api/posters/upload/route.ts` (새) | 직접 올리기 |
| `src/components/posters/poster-hang-button.tsx`·`poster-upload-button.tsx` (새) | 목록 화면 버튼 |
| `src/components/posters/poster-showcase.tsx` (새) | 상세 옆칸 포스터 + 크게 보기 + 홍보 줄 |
| `src/components/projects/poster-nudge.tsx` (새) | 주인 권유 카드 |
| `src/app/(nav)/posters/start/page.tsx` (새) | 홍보 줄 도착점(내 프로젝트 고르기) |
| `src/components/admin/hung-posters.tsx` (새) | `/admin` 걸린 포스터 목록·내리기 |

---

### Task 1: DB — 포스터 종류·걸린 포스터 칸

**Files:**
- Create: `supabase/migrations/20261107120000_poster_hang.sql`
- Modify: `src/lib/types.ts` (`projects`·`project_posters` Row/Insert/Update), `src/lib/projects/columns.ts`, `src/lib/posters/config.ts` (`perProject: 5`), `src/components/posters/poster-list-actions.tsx` (문구 "3개까지" → `POSTER_LIMITS.perProject`)

**Interfaces:**
- Produces:
  - `project_posters.kind text NOT NULL DEFAULT 'ai' CHECK (kind IN ('ai','upload'))`, `project_posters.image_url text NULL`, CHECK `kind <> 'upload' OR image_url IS NOT NULL`
  - `projects.poster_id uuid NULL REFERENCES project_posters(id) ON DELETE SET NULL` (+ 인덱스), `projects.poster_image_url text NULL`, `projects.poster_is_ai boolean NOT NULL DEFAULT false`, `projects.poster_hung_at timestamptz NULL`
  - anon/authenticated SELECT 허용: `poster_image_url`, `poster_is_ai`만 (`poster_id`·`poster_hung_at`은 서비스 키로만)
  - `PROJECT_COLUMNS` 끝에 `, poster_image_url, poster_is_ai`
  - `POSTER_LIMITS.perProject === 5`

- [ ] **Step 1: migration 작성**
  - `project_posters_limit()` 다시 정의: 개수 `>= 5`면 `poster_limit`, `project_poster_days` 삽입·`poster_daily`는 `NEW.kind = 'ai'`일 때만.
  - `projects_guard_owner()` 다시 정의: 기존 검사 + `poster_id`·`poster_image_url`·`poster_is_ai`·`poster_hung_at`이 바뀌면 `projects_owner_locked`(INSERT 때는 네 칸을 NULL/false로 덮음).
  - 새 트리거 `projects_poster_clear` (BEFORE UPDATE ON projects, `search_path = ''`): `NEW.poster_id IS NULL AND OLD.poster_id IS NOT NULL`이면 `poster_image_url := NULL, poster_is_ai := false, poster_hung_at := NULL` — FK `SET NULL`(포스터 삭제)과 내리기 모두 이 길로 비워진다. (FK 동작은 테이블 소유자 권한으로 돌아 guard를 통과한다 — Step 2에서 확인.)
  - `GRANT SELECT (poster_image_url, poster_is_ai) ON public.projects TO anon, authenticated;`
  - `admin_actions.action` CHECK에 `'unhang'` 추가(Task 9용 — 기존 CHECK 제약을 DROP 후 같은 목록 + `'unhang'`으로 다시 ADD).
  - 머리 주석에 설계 문서 경로와 날짜.

- [ ] **Step 2: 운영 DB에서 롤백 트랜잭션으로 검증** (scratchpad에 SQL 파일, `supabase db query --linked -f <파일>`)

  `BEGIN; … ROLLBACK;` 안에서 migration 본문을 실행한 뒤 아래가 모두 기대대로인지 확인:
  - 아무 공개 프로젝트에 `kind='upload'` 행 5개 삽입 성공, 6번째 `poster_limit`.
  - 같은 날 `kind='ai'` 두 개 → 두 번째 `poster_daily`, `kind='upload'`는 하루 여러 개 성공.
  - `kind='upload', image_url=NULL` → CHECK 위반.
  - `UPDATE projects SET poster_id=<행>, poster_image_url='x', poster_is_ai=true, poster_hung_at=now()` 후 그 포스터 `DELETE` → 프로젝트의 네 칸이 NULL/false.
  - `SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims = '{"sub":"<소유자 uuid>","email":"…"}';` 로 `UPDATE projects SET poster_image_url='y'` → `projects_owner_locked`.
  - `SET LOCAL ROLE anon; SELECT poster_image_url, poster_is_ai FROM projects LIMIT 1` 성공, `SELECT poster_id FROM projects` → 42501.

  Expected: 위 6개 모두 기대대로. 하나라도 다르면 migration을 고치고 다시.

- [ ] **Step 3: 타입·칸 목록·한도 반영 후 타입 검사**

  `src/lib/types.ts`의 수동 `Database` 타입에 새 칸 추가, `PROJECT_COLUMNS`·`POSTER_LIMITS.perProject` 수정, `NewPosterButton` 문구를 `` `포스터는 ${POSTER_LIMITS.perProject}개까지예요. …` ``로.

  Run: `npx tsc --noEmit && npm test`
  Expected: 오류 0, 기존 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

migration과 코드를 **두 커밋으로** 나눈다(Step 5에서 migration 커밋만 main에 올리려고).

```bash
git add supabase/migrations/20261107120000_poster_hang.sql
git commit -m "feat(db): 포스터 종류·걸린 포스터 칸, 프로젝트당 5개"
git add src/lib/types.ts src/lib/projects/columns.ts src/lib/posters/config.ts src/components/posters/poster-list-actions.tsx
git commit -m "feat(posters): 걸린 포스터 칸 타입·한도 5개"
```

- [ ] **Step 5: migration만 먼저 운영에 (사용자 확인 뒤)**

  사용자에게 "migration만 먼저 main에 올려도 될까요? 칸 추가뿐이라 지금 사이트에는 영향이 없어요"라고 묻고, 허락하면 main worktree에서 `git cherry-pick <migration 커밋>` 후 `git push origin main`. 코드 커밋은 브랜치에 남긴다. (주의: 이 migration은 `poster_limit`를 5로 올리므로 그 사이 화면 문구 "3개까지"와 실제가 어긋나지만, 막는 쪽이 아니라 허용 쪽이라 문제없음.)
  확인: anon 키로 `GET <SUPABASE_URL>/rest/v1/projects?select=poster_image_url,poster_is_ai&limit=1` → 200, `supabase migration list --linked`에 `20261107120000` 적용됨.

---

### Task 2: 순수 판단 함수

**Files:**
- Create: `src/lib/posters/hang-logic.ts`, `src/lib/posters/hang-logic.test.ts`, `src/lib/nav-active.ts`, `src/lib/nav-active.test.ts`
- Modify: `src/components/shared/page-nav.tsx` (`resolveActive`를 `nav-active.ts`에서 import, 함수 본문 삭제)

**Interfaces:**
- Produces (`hang-logic.ts`, 상대 `.ts` import만):
  - `type PosterKind = 'ai' | 'upload'`
  - `canHangPoster(p: { kind: PosterKind; html: string | null; art_job_id: string | null; image_url: string | null }): boolean`
  - `hungIsStale(hungAt: string | null, posterUpdatedAt: string): boolean`
  - `showcaseVisible(p: { visibility: string; poster_image_url: string | null }): boolean`
  - `posterNudgeVisible(i: { isOwner: boolean; isPublic: boolean; hasHungPoster: boolean; otherNudgeShown: boolean }): boolean`
  - `posterStartTarget(projectIds: string[]): { kind: 'new' } | { kind: 'one'; id: string } | { kind: 'choose' }`
- Produces (`nav-active.ts`): `resolveActive(pathname: string): string` — 기존 규칙 + `/projects/<id>/poster`(하위 포함)와 `/posters/*`는 `"/projects/new"`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// hang-logic.test.ts
test('canHangPoster', () => {
  assert.equal(canHangPoster({ kind: 'upload', html: null, art_job_id: null, image_url: 'u' }), true)
  assert.equal(canHangPoster({ kind: 'upload', html: null, art_job_id: null, image_url: null }), false)
  assert.equal(canHangPoster({ kind: 'ai', html: '<div>', art_job_id: null, image_url: null }), true)
  assert.equal(canHangPoster({ kind: 'ai', html: null, art_job_id: null, image_url: null }), false)
  assert.equal(canHangPoster({ kind: 'ai', html: '<div>', art_job_id: 'job', image_url: null }), false) // 그림 그리는 중
})
test('hungIsStale', () => {
  assert.equal(hungIsStale(null, '2026-11-07T00:00:00Z'), false)
  assert.equal(hungIsStale('2026-11-07T01:00:00Z', '2026-11-07T00:00:00Z'), false)
  assert.equal(hungIsStale('2026-11-07T00:00:00Z', '2026-11-07T01:00:00Z'), true)
})
test('showcaseVisible', () => {
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: 'u' }), true)
  assert.equal(showcaseVisible({ visibility: 'private', poster_image_url: 'u' }), false)
  assert.equal(showcaseVisible({ visibility: 'public', poster_image_url: null }), false)
})
test('posterNudgeVisible', () => {
  const base = { isOwner: true, isPublic: true, hasHungPoster: false, otherNudgeShown: false }
  assert.equal(posterNudgeVisible(base), true)
  assert.equal(posterNudgeVisible({ ...base, isOwner: false }), false)
  assert.equal(posterNudgeVisible({ ...base, isPublic: false }), false)
  assert.equal(posterNudgeVisible({ ...base, hasHungPoster: true }), false)
  assert.equal(posterNudgeVisible({ ...base, otherNudgeShown: true }), false)
})
test('posterStartTarget', () => {
  assert.deepEqual(posterStartTarget([]), { kind: 'new' })
  assert.deepEqual(posterStartTarget(['a']), { kind: 'one', id: 'a' })
  assert.deepEqual(posterStartTarget(['a', 'b']), { kind: 'choose' })
})
// nav-active.test.ts
test('resolveActive', () => {
  assert.equal(resolveActive('/projects/new'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/edit'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/poster'), '/projects/new')
  assert.equal(resolveActive('/projects/abc/poster/def'), '/projects/new')
  assert.equal(resolveActive('/posters/start'), '/projects/new')
  assert.equal(resolveActive('/projects/abc'), '/explore')
  assert.equal(resolveActive('/explore'), '/explore')
  assert.equal(resolveActive('/haejwo/1'), '/tips')
  assert.equal(resolveActive('/domains'), '/domains')
  assert.equal(resolveActive('/'), '')
})
```

- [ ] **Step 2: 실패 확인** — Run: `npm test` / Expected: FAIL (모듈 없음)

- [ ] **Step 3: 두 파일 구현, `page-nav.tsx`는 import로 교체** (`/projects/<id>/poster` 판정은 `/^\/projects\/[^/]+\/poster(\/|$)/`)

- [ ] **Step 4: 통과 확인** — Run: `npm test && npx tsc --noEmit` / Expected: PASS, 오류 0

- [ ] **Step 5: 커밋**

```bash
git add src/lib/posters/hang-logic.ts src/lib/posters/hang-logic.test.ts src/lib/nav-active.ts src/lib/nav-active.test.ts src/components/shared/page-nav.tsx
git commit -m "feat(posters): 걸기·권유·메뉴 판단 함수"
```

---

### Task 3: 걸기·내리기 서버 액션

**Files:**
- Create: `src/lib/posters/render.ts`, `src/lib/cloudinary-delete.ts`, `src/lib/posters/hang-db.ts`, `src/lib/posters/hang.ts`
- Modify: `src/app/api/posters/[posterId]/export/route.ts` (Browser Rendering 호출을 `render.ts`로), `src/lib/privacy/actions.ts` (`deleteCloudinaryImages`를 새 파일 것으로 교체), `src/lib/privacy/format.ts` + `format.test.ts` (`cloudinaryPublicId`가 `dshs/posters/<id>`도 인식), `src/lib/posters/poster-db.ts` (`toPosterView`에 `kind`, `imageUrl`, `canHang` 추가), `src/lib/posters/store.ts` (`PosterView` 타입에 같은 칸)

**Interfaces:**
- Consumes: Task 1 칸, Task 2 `canHangPoster`, 기존 `uploadPosterArtBlob(body: Blob): Promise<string | null>`(`art.ts`, `dshs/posters`에 올림), `getBandAccess(projectId)`, `loadPoster(posterId)`
- Produces:
  - `renderPosterFile(i: { poster: ProjectPosterRow; title: string; projectId: string; format: 'png' | 'pdf'; scale: 1 | 2; printArt: boolean }): Promise<{ ok: true; body: ReadableStream<Uint8Array> } | { ok: false; status: number }>` — 내보내기 route 로직 그대로 옮김(`printArt: true`면 기존 `printArtUrl`, false면 `posterArtDisplayUrl`). 내보내기는 `scale: 2, printArt: true`.
  - `deleteCloudinaryImages(urls: string[]): Promise<void>` (`src/lib/cloudinary-delete.ts`, `'server-only'`, 최선 노력·실패 무시)
  - `setHungPoster(projectId: string, hung: { posterId: string; imageUrl: string; isAi: boolean } | null): Promise<boolean>` (`src/lib/posters/hang-db.ts`, `'server-only'`, 서비스 키) — 이전 걸린 값을 읽고 projects 칸을 바꾼 뒤(`null`이면 `poster_id: null`), 이전이 AI PNG이고 새 URL과 다르면 `deleteCloudinaryImages`, 두 경로 `revalidatePath`. 권한 확인은 부르는 쪽 몫. Task 4 올리기 route도 이것을 쓴다.
  - `hangPoster(posterId: string): Promise<{ error?: string }>` / `unhangPoster(projectId: string): Promise<{ error?: string }>` (`src/lib/posters/hang.ts`, `'use server'`, `(nav)` 밖)
  - `PosterView`에 `kind: PosterKind; imageUrl: string | null; canHang: boolean`

- [ ] **Step 1: `cloudinaryPublicId` 테스트 추가 후 실패 확인**

```ts
assert.equal(cloudinaryPublicId('https://res.cloudinary.com/c/image/upload/v1/dshs/posters/abc.png', 'c'), 'dshs/posters/abc')
assert.equal(cloudinaryPublicId('https://res.cloudinary.com/c/image/upload/v1/dshs/other/abc.png', 'c'), null)
```
Run: `npm test` / Expected: 첫 줄 FAIL

- [ ] **Step 2: 정규식에 `(?:posters\/)?` 추가 → `npm test` PASS**

- [ ] **Step 3: `render.ts`·`cloudinary-delete.ts` 만들고 export route·privacy actions를 그것으로 교체**

  export route 응답(파일 이름·헤더·429 문구)은 바뀌면 안 된다.

- [ ] **Step 4: `hang.ts` 구현**
  - `hangPoster`: `loadPoster` → `getBandAccess(poster.project_id)`(문자열이면 `POSTER_COPY.noPermission`) → `canHangPoster` 거짓이면 "그림이 다 그려진 뒤에 걸 수 있어요." → `upload`면 URL = `image_url`; `ai`면 `renderPosterFile({ format: 'png', scale: 1, printArt: false })` → `new Response(body).blob()` → `uploadPosterArtBlob` (실패·429면 "잠시 뒤 다시 걸어 주세요.") → `setHungPoster(projectId, { posterId, imageUrl, isAi: kind === 'ai' })` (false면 "걸지 못했어요. 잠시 뒤 다시 해 주세요.").
  - `unhangPoster`: `getBandAccess(projectId)` → `setHungPoster(projectId, null)`(트리거가 나머지 칸을 비움).
  - 블롭은 디코딩하지 않는다(Workers CPU).

- [ ] **Step 5: `toPosterView`·`PosterView` 확장, 검사** — Run: `npx tsc --noEmit && npm test` / Expected: 오류 0, PASS

- [ ] **Step 6: 로컬 확인** — `npm run dev`, 관리자 계정으로 기존 AI 포스터의 PNG 내보내기가 예전과 같은지(파일 받아짐) 확인. 걸기는 Task 5 화면에서 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/lib/posters/render.ts src/lib/cloudinary-delete.ts src/lib/posters/hang-db.ts src/lib/posters/hang.ts src/app/api/posters/\[posterId\]/export/route.ts src/lib/privacy/actions.ts src/lib/privacy/format.ts src/lib/privacy/format.test.ts src/lib/posters/poster-db.ts src/lib/posters/store.ts
git commit -m "feat(posters): 포스터 걸기·내리기, PNG 찍기 공용화"
```

---

### Task 4: 직접 올리기 API

**Files:**
- Create: `src/app/api/posters/upload/route.ts`
- Modify: `src/lib/posters/messages.ts` (올리기 문구)

**Interfaces:**
- Consumes: `getBandAccess`, `sniffImageType(head: Uint8Array)`(`art-jobs-logic.ts`), `uploadPosterArtBlob`, `setHungPoster`(Task 3), `deleteCloudinaryImages`
- Produces: `POST /api/posters/upload` — `multipart/form-data` 필드 `projectId`(uuid), `file`, `hang`(`"1"`이면 바로 걸기). 응답 `{ ok: true, posterId: string, url: string }` / `{ ok: false, error: string }`. 상태: 403(출처·권한), 401(로그인), 404(프로젝트·비공개), 400(필드), 413(10MB 초과), 415(형식), 409(`poster_limit` — "포스터는 5개까지예요. 하나를 지우면 올릴 수 있어요."), 502(Cloudinary 실패).

- [ ] **Step 1: route 구현** — 순서: `isSameOrigin` → 필드 검사 → `getBandAccess(projectId)` → 크기 → 앞 12바이트 `sniffImageType` → `uploadPosterArtBlob(file)` → 서비스 키로 `project_posters` insert `{ project_id, created_by: access.userId, kind: 'upload', image_url }` (`poster_limit`이면 방금 올린 그림 `deleteCloudinaryImages`) → `hang === '1'`이면 걸기 → `revalidatePath`.

- [ ] **Step 2: 수동 확인** (`npm run dev`, 로그인한 브라우저 콘솔에서 `fetch('/api/posters/upload', { method: 'POST', body: fd })`)
  - 정상 PNG → 200, 포스터 목록에 생김.
  - 이름만 `.png`인 HTML 파일 → 415, 행 없음.
  - 11MB 파일 → 413.
  - 남의 공개 프로젝트 id → 403.
  - `Origin: https://evil.dshs.dev`로 curl → 403.

- [ ] **Step 3: 검사·커밋** — `npx tsc --noEmit` 오류 0

```bash
git add src/app/api/posters/upload/route.ts src/lib/posters/messages.ts
git commit -m "feat(posters): 직접 만든 포스터 그림 올리기"
```

---

### Task 5: 포스터 목록 화면 — 올리기·걸기

**Files:**
- Create: `src/components/posters/poster-hang-button.tsx`, `src/components/posters/poster-upload-button.tsx`
- Modify: `src/app/(nav)/projects/[id]/poster/(list)/page.tsx`

**Interfaces:**
- Consumes: `hangPoster`, `unhangPoster`, `POST /api/posters/upload`, `hungIsStale`, `canHangPoster`, `POSTER_LIMITS.perProject`
- Produces: `<PosterHangButton posterId projectId hung={boolean} stale={boolean} disabled={boolean} />`, `<PosterUploadButton projectId full={boolean} />` (`"use client"`)

- [ ] **Step 1: 목록 페이지 고치기**
  - 포스터 목록은 `canUseAi`와 상관없이 읽는다(`id, kind, html, art_url, art_job_id, image_url, band_tone, band_position, updated_at`) + 서비스 키로 `projects.poster_id, poster_hung_at`.
  - 맨 위: "상세 페이지에 걸린 포스터" 한 줄 상태(없으면 "아직 걸린 포스터가 없어요. 아래에서 하나를 골라 걸어 보세요.").
  - 카드: `kind === 'upload'`면 `<img>`(rounded-2xl, `object-contain`, A4 비율 상자), `ai`면 기존 `PosterPreview`(링크로 스튜디오). 카드 아래 `PosterHangButton` + 기존 `DeletePosterButton`. 걸린 카드엔 "걸려 있어요" 알약 + "내리기", 오래됐으면 "걸린 뒤 고쳤어요 · 다시 걸기".
  - 머리 버튼 자리: `PosterUploadButton` + (`canUseAi`면) `NewPosterButton`. 둘 다 `full = posters.length >= POSTER_LIMITS.perProject`.
  - 띠 받기(`PosterBandDownload`)는 그대로 맨 위 유지 — 띠는 출력용.
- [ ] **Step 2: 버튼 구현** — 업로드는 숨은 `<input type="file" accept="image/png,image/jpeg,image/webp">`, 고르면 바로 올리고 `hang=1`(첫 포스터일 때만 기본 걸기 — 이미 걸린 게 있으면 `hang=0`), 끝나면 `router.refresh()`. 오류는 `toast.error`. 진행 중 문구 "올리는 중…"/"거는 중…".
- [ ] **Step 3: 로컬 확인** — 관리자·일반 학생(팀원) 계정으로: 올리기 → 걸림 표시, 다른 포스터 걸기 → 바뀜, 내리기, AI 포스터 걸기(PNG 생김, 상세에 반영), AI 포스터 고친 뒤 "다시 걸기" 보임, 5개면 두 버튼 꺼짐 + 안내. 모바일 폭 360px에서 가로 스크롤 없음.
- [ ] **Step 4: 검사·커밋** — `npx tsc --noEmit && npm run lint`

```bash
git add src/components/posters/poster-hang-button.tsx src/components/posters/poster-upload-button.tsx "src/app/(nav)/projects/[id]/poster/(list)/page.tsx"
git commit -m "feat(posters): 포스터 화면에서 올리기·걸기·내리기"
```

---

### Task 6: 상세 페이지 포스터 + 크게 보기 + 홍보 줄

**Files:**
- Create: `src/components/posters/poster-showcase.tsx`, `src/app/(nav)/posters/start/page.tsx`, `src/app/(nav)/posters/start/loading.tsx`
- Modify: `src/components/projects/project-detail-view.tsx` (옆칸 맨 위), `src/middleware.ts` (`PROTECTED_PREFIXES`에 `'/posters'`)

**Interfaces:**
- Consumes: `showcaseVisible`, `posterStartTarget`, `project.poster_image_url`·`project.poster_is_ai`(PROJECT_COLUMNS로 이미 읽힘), `canEdit`
- Produces: `<PosterShowcase projectId title imageUrl isAi canEdit />` (`"use client"` — `project-detail-view.tsx`는 서버·클라이언트 겸용이라 이 파일만 클라이언트)

- [ ] **Step 1: `PosterShowcase`**
  - 옆칸 카드 폭에 맞춘 `<button>` 안 `<img alt="">`(이름은 버튼 `aria-label="<title> 포스터 크게 보기"`), `rounded-2xl border`, 오른쪽 아래 작은 알약 "크게 보기"(돋보기 아이콘). hover는 `transition-colors`로 테두리만 진하게, `cursor-zoom-in`. 크기·위치 변화 없음.
  - 누르면 공용 `Dialog`: 큰 그림(`max-h-[calc(100dvh-8rem)] w-auto object-contain`, alt "<title> 홍보 포스터"), `isAi`면 알약 "AI로 만든 포스터".
  - `canEdit`이 거짓이면 창 아래 링크 "이 포스터, 내 프로젝트로도 만들 수 있어요 →" → `/posters/start`. 참이면 "포스터 바꾸기" → `/projects/<id>/poster`.
  - `next/image`가 아니라 `<img>`(Cloudinary URL, `loading="lazy"`) — 다른 프로젝트 아이콘 표시 방식과 맞출 것(구현자가 `isExternalImage` 쓰는 곳 확인).
- [ ] **Step 2: 상세 화면에 넣기** — `<aside>` 첫 자식으로 `showcaseVisible(project) && <PosterShowcase … />`. 빠른 상세(`quick-view.tsx`)도 같은 컴포넌트라 따로 손대지 않는다.
- [ ] **Step 3: `/posters/start` 페이지** (서버 컴포넌트)
  - 로그인 안 했으면 `redirect('/login?next=/posters/start')`(미들웨어도 막음).
  - 내가 고칠 수 있는 공개 프로젝트 id: `rpc('my_project_ids')` + `projects`를 `team_members`에 내 이메일이 든 것(`contains`) — 둘 다 `visibility = 'public'`, 중복 제거.
  - `posterStartTarget` → `new`: `redirect('/projects/new')`, `one`: `redirect('/projects/<id>/poster')`, `choose`: `PageHero`(section `new`, compact, 제목 "어느 프로젝트 포스터를 만들까요?") + 프로젝트 카드 목록(아이콘·이름, 누르면 그 포스터 화면).
  - `loading.tsx`는 기존 `page-skeleton.tsx`의 목록 뼈대.
- [ ] **Step 4: 로컬 확인**
  - 걸린 포스터가 있는 공개 프로젝트: 데스크탑 옆칸 맨 위, 모바일은 상세 설명 아래·개발자 위. 키보드 Tab·Enter로 열림, Esc로 닫힘.
  - 비공개로 바꾸면 안 보임(허용 사용자 계정으로도).
  - 탐색 목록에서 눌러 연 빠른 상세에서도 보임.
  - 다른 학생 계정: 홍보 링크 → 프로젝트 0/1/여러 개일 때 각각 맞는 곳으로. 비로그인 → 로그인 뒤 돌아옴.
  - `/projects/<id>/poster`와 `/posters/start`에서 메뉴 "프로젝트 등록"이 켜짐.
- [ ] **Step 5: 검사·커밋** — `npx tsc --noEmit && npm run lint`

```bash
git add src/components/posters/poster-showcase.tsx "src/app/(nav)/posters" src/components/projects/project-detail-view.tsx src/middleware.ts
git commit -m "feat(posters): 상세 페이지 포스터·크게 보기·내 포스터 만들기 길"
```

---

### Task 7: 주인 권유 카드

**Files:**
- Create: `src/components/projects/poster-nudge.tsx`
- Modify: `src/lib/projects/detail.ts` (`ProjectDetail`에 `ownerPoster: boolean`), `src/components/projects/project-detail-view.tsx`

**Interfaces:**
- Consumes: `posterNudgeVisible`, `ownerPreview`·`ownerOffer`·`ownerOldAddress`(기존)
- Produces: `ProjectDetail.ownerPoster: boolean`, `<PosterNudge projectId />`

- [ ] **Step 1: `detail.ts`** — `ownerPoster = posterNudgeVisible({ isOwner, isPublic: project.visibility === 'public', hasHungPoster: !!project.poster_image_url, otherNudgeShown: !!ownerPreview || !!ownerOffer || !!ownerOldAddress })`. 추가 쿼리 없음.
- [ ] **Step 2: `PosterNudge`** — `DomainNudge`와 같은 구조·모양(나에게만 보이는 안내예요 / 제목 "학교 게시판에 붙일 포스터를 만들어 볼까요?" / 한 줄 "AI로 만들거나 직접 만든 그림을 올리면 이 페이지에도 걸려요." / `SECTION_COLORS.new.button` 알약 "포스터 만들기" → `/projects/<id>/poster` / × → `localStorage['poster-nudge-dismissed:<id>']`, 서버 스냅샷 숨김).
- [ ] **Step 3: 상세 화면** — `OldAddressNudge` 다음에 `{ownerPoster && <PosterNudge projectId={project.id} />}`.
- [ ] **Step 4: 로컬 확인** — 주인(포스터 없음) 보임 / 팀원·관리자·남 안 보임 / 익명 프로젝트 주인 보임 / 걸면 사라짐 / 도메인 권유가 뜨는 프로젝트에선 안 보임 / × 뒤 새로 고쳐도 안 보임.
- [ ] **Step 5: 검사·커밋**

```bash
git add src/components/projects/poster-nudge.tsx src/lib/projects/detail.ts src/components/projects/project-detail-view.tsx
git commit -m "feat(posters): 프로젝트 주인에게 포스터 만들기 권유"
```

---

### Task 8: 등록·수정 폼 "홍보 포스터" 카드

**Files:**
- Create: `src/components/posters/poster-file-field.tsx`
- Modify: `src/components/projects/project-form.tsx`

**Interfaces:**
- Consumes: `POST /api/posters/upload`, `posterAllowed`(config, 클라이언트 import 가능한 순수 파일), `initialData.poster_image_url`
- Produces: `<PosterFileField file onChange disabledReason />` (`"use client"`, 고른 파일을 **바로 올리지 않고** 미리보기만 — `URL.createObjectURL`, 해제 처리)

설계 §9와 달라진 점(구현 판단, 사용자에게 보고): 파일을 Cloudinary에 미리 올리지 않고 **프로젝트 저장이 성공한 뒤** 올린다 → 이탈·실패로 남는 고아 파일이 생기지 않는다. 비공개 프로젝트는 올리기 칸을 끄고 "공개 프로젝트만 포스터를 걸 수 있어요" 한 줄(포스터 권한이 공개 프로젝트에만 있음).

- [ ] **Step 1: 카드 추가** — `FormSection id="section-poster" title="홍보 포스터" hint="선택"`을 "공개 범위·만든 사람" 뒤, 위험 구역 앞에. 내용:
  - `PosterFileField` (PNG·JPEG·WebP, 10MB 넘으면 그 자리에서 안내). 아래 작은 글 "학교 게시판에 붙일 포스터 그림을 올리면 상세 페이지에 걸려요." 익명이면 "포스터에 이름을 넣으면 익명이 풀려요." 한 줄 추가.
  - 새 등록이고 `posterAllowed(false)`(= 학생에게 열림)일 때만 체크 "등록한 뒤 AI로 포스터 만들기".
  - 수정이면 지금 걸린 포스터 작은 미리보기 + 링크 "포스터 화면에서 고르기"(`/projects/<id>/poster`).
- [ ] **Step 2: 목차** — `railSections`에 `{ id: "section-poster", title: "홍보 포스터", done: Boolean(posterFile) || makeAiPoster || Boolean(initialData?.poster_image_url) }`. `requiredFlags`에는 넣지 않는다.
- [ ] **Step 3: 저장 흐름** (`handleSubmit`)
  - 프로젝트 insert/update 성공 뒤, `posterFile && visibility === 'public'`이면 `FormData{ projectId, file, hang: '1' }`로 올리기. 실패하면 `toast.error('프로젝트는 저장했어요. 포스터는 포스터 화면에서 다시 올려 주세요.')` 후 흐름 계속(되돌리지 않음).
  - 새 등록 이동 순서: `nextHref` 흐름(기존) → `makeAiPoster && 공개`면 `router.push('/projects/<id>/poster')`(도메인 권유 창 건너뜀) → 기존 도메인 권유 → 상세.
  - `allowLeave()`는 기존 위치 그대로(저장 성공 직후) — 올리는 동안 이탈 경고가 다시 뜨지 않게.
- [ ] **Step 4: 로컬 확인** — 그림 골라 등록 → 상세에 걸림 / AI 체크 → 포스터 화면으로 / 둘 다 안 고르면 예전과 똑같음(도메인 권유 포함) / 비공개 선택 시 칸 꺼짐 / 수정 폼에서 새 그림 → 저장 후 그 그림이 걸림(5개 차 있으면 토스트) / Review Focus 5: 개발자 도구로 `/api/posters/upload`를 막고 등록 → 프로젝트 생김 + 안내 토스트 + 상세로 이동.
- [ ] **Step 5: 검사·커밋** — `npx tsc --noEmit && npm run lint`

```bash
git add src/components/posters/poster-file-field.tsx src/components/projects/project-form.tsx
git commit -m "feat(posters): 등록·수정 폼에 홍보 포스터 선택 카드"
```

---

### Task 9: 관리자 — 걸린 포스터 검토

**Files:**
- Create: `src/components/admin/hung-posters.tsx`
- Modify: `src/lib/admin/actions.ts` (`adminUnhangPoster`), `src/lib/admin/read.ts` (걸린 포스터 최근 20개), `src/app/(nav)/admin/page.tsx` (`최신 글` 다음 구역 `id="posters"` "걸린 포스터"). `'unhang'` 기록은 Task 1 migration이 CHECK에 넣어 둠.
- 설계 §7은 「최신 글」 안에 넣는다고 했지만, 최신 글은 글 종류(`ContentKind`)마다 삭제·차단이 묶여 있어 따로 구역으로 둔다(구현 판단).

**Interfaces:**
- Consumes: `requireAdmin()`, `deleteCloudinaryImages`, 기존 `record(admin, {...})`
- Produces: `adminUnhangPoster(projectId: string): Promise<AdminActionResult>`; `loadAdminDashboard()` 결과에 `hungPosters: { projectId: string; title: string; imageUrl: string; isAi: boolean; hungAt: string }[]`

- [ ] **Step 1: 구현** — 읽기는 서비스 키 `projects` `poster_image_url is not null` `order poster_hung_at desc limit 20`. 화면은 작은 썸네일 격자(누르면 원본 새 탭), 프로젝트 링크, "내리기"(`ConfirmAction` 재사용), 관리 기록 `action: 'unhang'`. 올린 사람 차단은 기존 프로젝트 기준 차단(`adminBanByContent('project', id, …)`) 버튼 재사용.
- [ ] **Step 2: 로컬 확인** — 관리자: 목록 보임·내리기 후 상세에서 사라짐. 일반 계정 `/admin` 404 그대로.
- [ ] **Step 3: 검사·커밋**

```bash
git add src/components/admin/hung-posters.tsx src/lib/admin/actions.ts src/lib/admin/read.ts "src/app/(nav)/admin/page.tsx"
git commit -m "feat(admin): 걸린 포스터 검토·내리기"
```

---

### Task 10: 학생에게 열기 + 처리방침 + 정리 + 문서

**Files:**
- Modify: `src/lib/posters/config.ts` (`POSTER_OPEN_TO_ALL = true`), `src/lib/privacy/policy.ts` (+ `PRIVACY_EFFECTIVE_DATE`), `src/lib/privacy/actions.ts` (탈퇴 시 포스터 그림 URL 모으기), `src/lib/projects/actions.ts` (프로젝트 삭제 시 포스터 그림 정리), `src/app/(nav)/projects/[id]/poster/(list)/page.tsx` ("실험" 알약 제거), `.claude/rules/posters.md`, `.claude/rules/projects.md`, `.claude/rules/nav.md`, `.claude/rules/privacy.md`, `.claude/rules/admin.md`, `CLAUDE.md`(보호 라우트에 `/posters`)

- [ ] **Step 1: 처리방침 본문**
  - 위탁 표에 행 추가: `| Google LLC (Gemini API) | AI 포스터 만들기 | 포스터를 만든 공개 프로젝트의 정보(이름·종류·플랫폼·소개, 공개 GitHub 저장소의 설명·토픽·주 언어·README)와 학생이 적은 부탁 문구 | 미국 등 |` + 표 아래 한 줄 "Gemini 무료 API라 Google이 보낸 내용을 서비스 개선(AI 학습)에 쓸 수 있어요. 이름·이메일·실명은 보내지 않아요."
  - Cloudinary 행 항목에 "포스터 그림(직접 올린 그림·AI 그림·상세 페이지에 건 포스터)" 추가, 탈퇴 문단의 "지우도록 요청해요" 목록에도 "포스터 그림".
  - Cloudflare 행이 Workers AI·Browser Rendering(그림 생성·포스터 파일 만들기)을 포함하는지 확인하고 빠졌으면 추가.
  - 학교 Mac mini(교내 기기에서 그림 생성 — 보내는 건 영어 그림 설명뿐)도 한 줄로 적을지 확인: 개인정보가 안 가므로 위탁 아님 — 적지 않는다(판단 근거를 `privacy.md`에 기록).
  - `PRIVACY_EFFECTIVE_DATE`를 배포일로(사용자가 배포일을 정하면 그 날짜, 기본 2026-11-07).
- [ ] **Step 2: 정리 코드**
  - `withdrawAccount`: `withdraw_account` RPC **전에** 서비스 키로 내 프로젝트(`author_id = user`)의 `project_posters.image_url`·`art_url`과 `projects.poster_image_url`을 모아, RPC가 돌려준 URL 목록과 합쳐 `deleteCloudinaryImages`.
  - `deleteProject`: 삭제 전에 같은 방식으로 그 프로젝트 포스터 그림 URL을 모으고, 삭제 성공 뒤 `deleteCloudinaryImages`.
- [ ] **Step 3: 플래그·문구** — `POSTER_OPEN_TO_ALL = true`, 목록 화면 "실험" 알약 제거, `access.canUseAi`가 모든 권한자에게 참인지 `decide.test.ts`에 한 줄 추가:

```ts
test('학생에게 열림 — 소유자·팀원도 AI 사용', () => {
  const base = { loggedIn: true, isAdmin: false, isOwner: true, isTeamMember: false, isPublic: true, banned: false }
  assert.equal(decidePosterAccess(base), 'ok')
  assert.equal(decidePosterAccess({ ...base, isOwner: false, isTeamMember: true }), 'ok')
  assert.equal(decidePosterAccess({ ...base, banned: true }), 'forbidden')
})
```
  기존 테스트 중 "관리자만" 기대가 있으면 새 기대로 고친다.
- [ ] **Step 4: 문서** — `posters.md`(2단계 열림, 종류·걸기·올리기·한도 5·홍보 줄·권유 카드), `projects.md`(상세 옆칸 포스터·폼 카드·권유 우선순위), `nav.md`(활성 판정 표에 포스터 경로·`nav-active.ts`), `privacy.md`(이번 개정 기록), `admin.md`(걸린 포스터 구역), `CLAUDE.md` 보호 라우트.
- [ ] **Step 5: 전체 검사** — Run: `npx tsc --noEmit && npm test && npm run lint && npm run build`
  Expected: 모두 성공.
- [ ] **Step 6: 커밋**

```bash
git add src/lib/posters/config.ts src/lib/posters/decide.test.ts src/lib/privacy/policy.ts src/lib/privacy/actions.ts src/lib/projects/actions.ts "src/app/(nav)/projects/[id]/poster/(list)/page.tsx" .claude/rules/posters.md .claude/rules/projects.md .claude/rules/nav.md .claude/rules/privacy.md .claude/rules/admin.md CLAUDE.md
git commit -m "feat(posters): 학생에게 열기 — 처리방침 개정·그림 정리·문서"
```

---

### Task 11: 마무리 확인과 배포 (사용자가 시점 결정)

- [ ] **Step 1: `wrangler dev`로 OpenNext 빌드 확인** — 상세(포스터 있음/없음), 포스터 화면 올리기·걸기(AI PNG 포함), `/posters/start`, `/admin` 걸린 포스터. Workers 로그에 `[poster]` 오류 없음.
- [ ] **Step 2: 사용자에게 보고하고 배포 시점 묻기** — "배포하면 모든 학생에게 개인정보 동의 창이 다시 떠요. 언제 올릴까요?" 허락 전엔 main에 푸시하지 않는다.
- [ ] **Step 3: 허락 뒤** — 브랜치를 main에 합쳐 푸시(Task 1 migration은 이미 운영에 있음, 추가 migration이 있으면 그 내용이 코드보다 먼저여도 안전한지 확인 — 칸 추가·CHECK 확장만이면 같은 푸시 가능). 배포 뒤 `curl -s https://dshs.dev/cdn-cgi/trace | grep colo`, 걸린 포스터 있는 프로젝트 상세를 비로그인으로 열어 확인.
- [ ] **Step 4: 첫 포스터 부탁** — 사용자가 주인 몇 명에게 직접 부탁(코드 작업 아님, 체크만).
