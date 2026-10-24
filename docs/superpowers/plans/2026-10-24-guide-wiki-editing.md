# 가이드 위키식 편집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 누구나 가이드 조각을 고치고, 모든 저장이 작성자 있는 버전으로 남고, 어느 버전으로든 되돌릴 수 있게 한다.

**Architecture:** 버전은 Supabase `guide_revisions`(쓰기 금지 RLS + `service_role` 전용 저장 함수)에 쌓는다. 순수 로직(단계 이름·통계·diff·되돌려짐 계산)은 `src/lib/guide-wiki/`의 프레임워크 없는 모듈로 두고 `node --test`로 검증한다. 재작성 중인 가이드 구조와는 `source.ts` 한 파일로만 닿고, 연결 전에는 개발용 `dev-sample` 조각으로 끝까지 동작시킨다.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase(`@supabase/ssr`, `createAdminClient`), zod 4, `diff`(jsdiff), Tailwind v4 + shadcn base-nova, sonner, date-fns.

**Spec:** `docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md`(시안: https://claude.ai/artifact/7Wh7o1TxSvSjf24CK1K3zc 의 2-B·3·4·5 보드)

## Global Constraints

- 재작성 세션 소유 파일은 건드리지 않는다: `src/lib/guide.ts`, `src/lib/guide-content.ts`, `src/content/guides/`, `src/components/guide/*`, `src/app/(nav)/guide/**`.
- 서버 액션은 `src/lib/guide-wiki/actions.ts`(`(nav)` 밖).
- 한도: 단계 1~50개, 단계 body 각 20,000자 이하, steps JSON 200KB 이하, summary 1~100자(trim 후), title 1~120자, doc_key `^[a-z0-9][a-z0-9-]{0,99}$`.
- `kind` ∈ `seed | edit | revert | sync`. seed는 `rev_no=1`, `summary='저장소 원본'`. sync summary는 `'저장소 원본 가져오기'`.
- `dev-sample`은 `process.env.NODE_ENV !== 'production'`일 때만 존재.
- 스타일: 선택·펼침 상태는 zinc-900 무채색, purple-600은 저장하기·되돌리기 확정·단계 번호 강조에만. 카드 `rounded-[20px]`, 글 카드 `rounded-3xl`. `transition-all`·hover 확대 금지. 모바일 `px-6`, 터치 대상 ≥44px. 아이콘 버튼 한국어 `aria-label`, 장식 아이콘 `aria-hidden`. 해요체, 로딩 문구 `…`.
- `any` 금지. 페이지는 모두 `export const dynamic = 'force-dynamic'`.
- 커밋 메시지 끝에 세션이 준 attribution 줄을 붙인다.
- 단계 본문 렌더링은 `src/components/guide-wiki/step-body.tsx`의 `StepBody({ body })` 한 곳을 거친다. 지금은 `Markdown`을 감쌀 뿐이다. 재작성 세션이 단계 안 상자 표기("AI에게 이렇게 말해요"·"됐다는 신호"·"주의")용 렌더러 `GuideStepBody({ body }: { body: string })`(`src/components/guide/guide-step-body.tsx`, 클라이언트 사용 가능한 순수 컴포넌트)가 main에 올라오면 이 파일만 바꾼다(2026-10-24 b1 합의: 결과 화면 = 장 4개 = 조각 4개, 장마다 고치기·기록 링크).

## Review Focus

1. **한글·이모지가 섞인 본문의 글자 수 통계** — `+/−` 글자 수는 UTF-16 길이가 아니라 `[...str].length`(코드 포인트)로 센다. 이모지 하나가 2로 세지면 안 된다. → Task 2 테스트 `counts code points`.
2. **헤딩 없는·빈 단계** — 첫 줄이 헤딩이 아니거나 비어 있으면 단계 이름은 "제목 없는 단계"이고, 공백만 있는 body는 저장 거부. → Task 2 `titleOf` 테스트, Task 4 schema 테스트 `rejects blank body`.
3. **from 파라미터 악용** — `?from=https://evil.com`이나 `//evil.com`은 무시하고 기록 페이지로 간다. → Task 6 `safeFrom` 테스트.
4. **원본에도 DB에도 없는 key, 범위 밖 버전 번호** — `/guide-wiki/nope/history`, `/rev/999`, `/diff?from=3&to=2`는 `notFound()`(from ≥ to도 404). → Task 3 `parseRevParam` 테스트 + Task 8 수동 확인.
5. **저장 중 두 번 클릭·느린 네트워크** — 저장 버튼은 진행 중 비활성("저장하는 중…"), 같은 baseRev로 두 번 가지 않는다. → Task 6 수동 시나리오.

---

### Task 1: DB 스키마와 적용

**Files:**
- Create: `docs/17-supabase-guide-revisions.sql`
- Create: `supabase/migrations/20261024120000_guide_revisions.sql`(docs/17과 같은 내용)
- Modify: `src/lib/types.generated.ts`(재생성), `src/lib/types.ts`

**Interfaces:**
- Produces: 테이블 `public.guide_revisions`(스펙 5절 컬럼 그대로), 함수 `public.save_guide_revision(p_author_id uuid, p_doc_key text, p_base_rev int, p_kind text, p_title text, p_steps jsonb, p_extra jsonb, p_summary text, p_revert_of int, p_stats jsonb, p_seed jsonb) returns int`(새 rev_no). 충돌 시 `RAISE EXCEPTION 'conflict:%', latest USING ERRCODE = 'P0001'`. `p_seed`는 `{title, steps, extra, stats}` 또는 NULL.
- Produces (`src/lib/types.ts`): `export type GuideRevisionKind = 'seed'|'edit'|'revert'|'sync'` 와 `GuideRevisionRow`(테이블 행 타입).

- [ ] **Step 1: SQL 작성** — 기존 docs/08 관례대로 머리 주석 + `DROP ... IF EXISTS` 재실행 가능. 스펙 5절 CHECK 전부, 인덱스 2개, `ENABLE ROW LEVEL SECURITY`, `guide_revisions_select_all` SELECT 정책만. 함수는 `SECURITY DEFINER SET search_path = public`, 스펙 5절 1~6단계 순서, steps 검증은 `jsonb_typeof = 'array'`, 길이 1~50, `octet_length(p_steps::text) <= 204800`, 각 원소 `body` 길이 ≤ 20000. 끝에 `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role;`.
- [ ] **Step 2: 원격 migration 상태 확인** — Run: `supabase migration list --linked`. Expected: 로컬·원격 모두 `20260603085157`만. 다르면 멈추고 사용자에게 보고.
- [ ] **Step 3: 적용** — Run: `supabase db push --linked`(확인 프롬프트에 새 migration 하나만 보여야 함). Expected: `Finished supabase db push.`
- [ ] **Step 4: 권한 확인** — Run: `supabase db query --linked "select has_function_privilege('authenticated','public.save_guide_revision(uuid,text,int,text,text,jsonb,jsonb,text,int,jsonb,jsonb)','execute')"`. Expected: `f`. 설치된 CLI에 `db query`가 없으면 이 단계는 건너뛰고 Task 9 Step 2(anon 키로 rpc 호출 → permission denied)로 확인한다.
- [ ] **Step 5: 타입 재생성** — Run: `npm run db:types && npx tsc --noEmit`. Expected: 에러 0. `src/lib/types.ts`에 위 두 타입 추가.
- [ ] **Step 6: Commit** — `feat(guide-wiki): guide_revisions 테이블과 저장 함수`

### Task 2: 순수 로직 — 단계·통계·diff·되돌려짐

**Files:**
- Create: `src/lib/guide-wiki/types.ts`, `src/lib/guide-wiki/steps.ts`, `src/lib/guide-wiki/diff.ts`
- Test: `src/lib/guide-wiki/steps.test.ts`, `src/lib/guide-wiki/diff.test.ts`
- Modify: `package.json`(dep `diff`, devDep `@types/diff` 필요 시, script `"test": "node --test src/**/*.test.ts"`), `tsconfig.json`(`"allowImportingTsExtensions": true` — 테스트가 `./diff.ts`로 import)

**Interfaces:**
- Produces (`types.ts`): `WikiStep = { id: string; body: string }`, `WikiDoc = { key: string; title: string; steps: WikiStep[]; extra: unknown | null }`, `RevisionStats = { added: number; removed: number; edited: number; moved: number; plus: number; minus: number; sourceHash?: string }`.
- Produces (`steps.ts`): `titleOf(body: string): string`, `newStepId(): string`(8자 `[a-z0-9]`), `seedSteps(bodies: string[]): WikiStep[]`(id `s1..sn`).
- Produces (`diff.ts`):
  - `computeStats(before: WikiStep[], after: WikiStep[]): RevisionStats`
  - `diffSteps(before: WikiStep[], after: WikiStep[]): StepDiff[]` where `StepDiff = { kind: 'same'|'edited'|'added'|'removed'; id: string; title: string; fromIndex: number | null; toIndex: number | null; moved: boolean; lines: LineDiff[] }`, `LineDiff = { op: 'same'|'add'|'del'; text: string }`
  - `revertedBy(revs: { revNo: number; kind: string; revertOf: number | null }[]): Map<number, number>` — revNo → 그 버전을 무효로 만든 가장 나중 revert의 revNo
  - `describeStats(s: RevisionStats): string` — "단계 1개 추가 · 1개 삭제 · 2개 수정 · 순서 바뀜", 빈 경우 `''`
- 모든 파일은 상대 import + `import type`만(노드 테스트에서 `@/` 별칭 못 씀). 외부 import는 `diff`만.

- [ ] **Step 1: 실패하는 테스트 작성** (`node:test` + `node:assert/strict`)
  - `titleOf`: `'## 폴더 열기\n본문'` → `'폴더 열기'`, `'# A'` → `'A'`, `'본문만'` → `'본문만'`, `''`·`'\n  \n'` → `'제목 없는 단계'`.
  - `seedSteps(['a','b'])` → ids `['s1','s2']`. `newStepId()`가 `/^[a-z0-9]{8}$/`.
  - `computeStats`: 원본 a,b,c,d → [a, b′(수정), n(새), d] 에서 c 삭제 → `{added:1, removed:1, edited:1, moved:0}`. a,b,c → c,a,b → `moved` ≥ 1. 동일 입력 → 전부 0.
  - `counts code points`: `before=[{id:'a',body:'가'}]`, `after=[{id:'a',body:'가😀'}]` → `plus === 1`, `minus === 0`.
  - `diffSteps`: 수정 단계 lines에 `{op:'del',text:'mkdir a'}`, `{op:'add',text:'mkdir b'}`. 추가 단계는 kind `added`·모든 줄 `add`. 삭제 단계는 kind `removed`, `toIndex` null. 순서만 바뀐 단계는 kind `same`, `moved: true`.
  - `revertedBy`: revs 1..5 edit, 6 revert(revertOf 2) → map {3→6, 4→6, 5→6}, 2와 6은 없음. 이어서 7 revert(revertOf 4)는 5,6을 7로(5는 6→7로 갱신, 가장 나중 우선).
  - `describeStats({added:1,removed:1,edited:2,moved:1,...})` → `'단계 1개 추가 · 1개 삭제 · 2개 수정 · 순서 바뀜'`.
- [ ] **Step 2: 실패 확인** — Run: `npm test`. Expected: FAIL(모듈 없음).
- [ ] **Step 3: 구현** — 단계 짝짓기는 id 기준. `moved`는 "양쪽에 다 있는 id들의 상대 순서"에서 LIS 밖에 있는 것. 줄 diff는 `diffLines(a, b)`를 줄 단위 `LineDiff[]`로 펼친다. plus/minus는 줄 diff 결과의 add/del 텍스트 코드 포인트 합(추가·삭제 단계 포함).
- [ ] **Step 4: 통과 확인** — Run: `npm test && npx tsc --noEmit`. Expected: 전부 PASS, 타입 에러 0.
- [ ] **Step 5: Commit** — `feat(guide-wiki): 단계 통계·diff·되돌려짐 계산`

### Task 3: 원본·읽기 계층

**Files:**
- Create: `src/lib/guide-wiki/dev-sample.ts`, `src/lib/guide-wiki/source.ts`, `src/lib/guide-wiki/read.ts`, `src/lib/guide-wiki/params.ts`
- Test: `src/lib/guide-wiki/params.test.ts`

**Interfaces:**
- Consumes: Task 1 `GuideRevisionRow`, Task 2 `WikiDoc`, `seedSteps`.
- Produces (`source.ts`, `import "server-only"`): `loadSourceDoc(key: string): Promise<WikiDoc | null>`, `listUsages(key: string): Promise<{ label: string; href: string }[]>`, `sourceHash(doc: WikiDoc): string`(sha256 hex of `JSON.stringify({title, steps: bodies, extra})`, `node:crypto`). 지금은 `dev-sample`만(비운영), `listUsages`는 `dev-sample`에 대해 예시 2곳.
- Produces (`dev-sample.ts`): `DEV_SAMPLE: WikiDoc` — 시안의 4단계("Claude 데스크톱 설치하기"·"프로젝트 폴더 열기"·"첫 요청 보내기"·"결과 열어 보기"), key `dev-sample`.
- Produces (`read.ts`, `import "server-only"`, 읽기는 `createClient()`):
  - `getLatestDoc(key): Promise<{ doc: WikiDoc; revNo: number } | null>` — DB 최신, 없으면 원본 + `revNo: 0`
  - `getDocMeta(key): Promise<{ latestRev: number; lastAuthor: { id: string | null; nickname: string } | null; lastAt: string | null; contributors: number } | null>`
  - `listRevisions(key, opts: { before?: number; limit?: number }): Promise<RevisionListItem[]>` — `RevisionListItem = { revNo; kind; summary; stats: RevisionStats; revertOf: number | null; createdAt: string; author: { id: string | null; nickname: string | null; avatarUrl: string | null; email: string } }`, `users!guide_revisions_author_id_fkey` FK 명시 조인, 기본 limit 30
  - `getRevision(key, revNo): Promise<{ doc: WikiDoc; item: RevisionListItem } | null>`
  - `getRevertedMap(key): Promise<Map<number, number>>` — 해당 문서의 (revNo, kind, revertOf) 전부를 읽어 `revertedBy`
  - `isSourceStale(key): Promise<boolean>` — 마지막 seed/sync 행의 `stats.sourceHash` ≠ 지금 `sourceHash`
- Produces (`params.ts`, 순수): `parseRevParam(v: string | string[] | undefined): number | null`(양의 정수 문자열만), `safeFrom(v: string | string[] | undefined): string | null`(`/guide`로 시작하고 `//`·`\`·`://` 없을 때만).

- [ ] **Step 1: `params.test.ts` 작성** — `parseRevParam('3')`→3, `'0'`·`'-1'`·`'1.5'`·`'abc'`·`undefined`·`['2','3']`→null. `safeFrom('/guide/web/x')`→그대로, `'/guide-wiki/a'`→그대로, `'https://evil.com'`·`'//evil.com'`·`'/guide\\evil'`·`'/tips'`·`undefined`→null.
- [ ] **Step 2: 실패 확인** — `npm test` FAIL.
- [ ] **Step 3: 구현** (`params.ts` → `dev-sample.ts` → `source.ts` → `read.ts`)
- [ ] **Step 4: 확인** — `npm test && npx tsc --noEmit` PASS.
- [ ] **Step 5: Commit** — `feat(guide-wiki): 원본 어댑터와 읽기 함수`

### Task 4: 서버 액션

**Files:**
- Create: `src/lib/guide-wiki/schema.ts`, `src/lib/guide-wiki/actions.ts`
- Test: `src/lib/guide-wiki/schema.test.ts`

**Interfaces:**
- Consumes: Task 2 `computeStats`, Task 3 `loadSourceDoc`, `sourceHash`, `getLatestDoc`, `createAdminClient`·`createClient`(`@/lib/supabase/server`).
- Produces (`schema.ts`, 순수 zod): `EditInputSchema`(key, baseRev int ≥0, title, steps, summary — Global 한도, 단계 id `^[a-z0-9]{1,16}$` 중복 거부, body trim 후 빈 값 거부), `RevertInputSchema`(key, targetRev ≥1, baseRev ≥1, reason 1~100), `SyncInputSchema`(key, baseRev ≥1).
- Produces (`actions.ts`, `"use server"`):
  - `saveGuideEdit(input: EditInput): Promise<SaveResult>`
  - `revertGuide(input: RevertInput): Promise<SaveResult>`
  - `syncFromSource(input: SyncInput): Promise<SaveResult>`
  - `type SaveResult = { revNo: number } | { error: string } | { conflict: { latestRev: number } }`

- [ ] **Step 1: `schema.test.ts`** — 정상 입력 통과. 거부: 단계 0개 / 51개, body `'   '`(`rejects blank body`), body 20,001자, summary `'  '`, summary 101자, 중복 id, key `'Bad_Key'`, baseRev -1. 오류 메시지는 해요체 한국어(예: "무엇을 고쳤는지 한 줄로 적어 주세요.").
- [ ] **Step 2: 실패 확인** — `npm test` FAIL.
- [ ] **Step 3: 구현** — 공통 흐름: `createClient().auth.getUser()` 없으면 `{ error: '로그인이 필요해요.' }` → zod → 직전 버전(`getLatestDoc`)과 `computeStats` → edit은 전부 0이면 `{ error: '바뀐 점이 없어요.' }` → `extra`는 직전 값 복사 → seed 인자는 `revNo === 0`일 때만 `{ title, steps, extra, stats: { ...zero, sourceHash } }` → `createAdminClient().rpc('save_guide_revision', …)` → 오류 메시지가 `conflict:N`이면 `{ conflict: { latestRev: N } }` → 성공 시 `revalidatePath('/guide', 'layout')`, `revalidatePath('/guide-wiki/' + key, 'layout')`. revert는 `getRevision(target)`의 내용을 넣고 target === 최신이면 `{ error: '지금 버전으로는 되돌릴 수 없어요.' }`. sync는 `isSourceStale` false면 `{ error: '저장소 원본이 바뀌지 않았어요.' }`, stats에 새 `sourceHash`.
- [ ] **Step 4: 확인** — `npm test && npx tsc --noEmit && npm run lint` PASS.
- [ ] **Step 5: Commit** — `feat(guide-wiki): 저장·되돌리기·원본 가져오기 서버 액션`

### Task 5: 편집 경로 보호

**Files:**
- Modify: `src/middleware.ts:13-26`(`isProtectedRoute`)

- [ ] **Step 1:** `if (/^\/guide-wiki\/[^/]+\/edit\/?$/.test(pathname)) return true;` 추가. `page-nav.tsx`는 이미 `startsWith("/guide")`라 `/guide-wiki`도 "나도 개발해볼래!"로 활성 — 변경 없음.
- [ ] **Step 2: 확인** — `npm run dev` 후 비로그인으로 `curl -sI localhost:3000/guide-wiki/dev-sample/edit` → `307`, `location`에 `/login?next=%2Fguide-wiki%2Fdev-sample%2Fedit`.
- [ ] **Step 3: Commit** — Task 6과 함께 커밋해도 됨.

### Task 6: 편집기 (시안 2-B + 미리보기)

**Files:**
- Create: `src/components/guide-wiki/step-body.tsx`, `src/components/guide-wiki/editor/reducer.ts`, `src/components/guide-wiki/editor/guide-wiki-editor.tsx`, `src/components/guide-wiki/editor/step-card.tsx`, `src/components/guide-wiki/editor/insert-line.tsx`, `src/components/guide-wiki/editor/save-bar.tsx`, `src/components/guide-wiki/editor/whole-preview.tsx`, `src/components/guide-wiki/doc-header.tsx`(편집·기록·비교 공용 머리: 뒤로가기, 작은 설명줄, Plex 제목, "가이드 N곳에 함께 쓰여요" 팝오버)
- Create: `src/app/(nav)/guide-wiki/[key]/edit/page.tsx`
- Test: `src/components/guide-wiki/editor/reducer.test.ts`(reducer는 `reducer.ts`로 분리해 순수하게)

**Interfaces:**
- Consumes: `getLatestDoc`, `listUsages`, `isSourceStale`, `safeFrom`, `saveGuideEdit`, `describeStats`, `computeStats`, `titleOf`, `newStepId`, `StepBody`(Global Constraints, Task 6에서 생성).
- Produces (`reducer.ts`): `EditorState = { original: WikiStep[]; steps: (WikiStep & { gone: boolean })[]; openId: string | null; mode: 'write'|'split'|'preview'; whole: boolean; summary: string }`, actions `insert{at}`, `edit{id, body}`, `remove{id}`, `restore{id}`, `move{id, dir: -1|1}`, `toggle{id}`, `mode{mode}`, `whole{}`, `summary{text}`, `liveSteps(state): WikiStep[]`.

- [ ] **Step 1: reducer 테스트** — insert at 0 → 새 단계가 맨 앞, `openId`가 새 id, body `'## 새 단계\n\n'`. 원본 단계 remove → `gone: true`로 자리에 남음, restore로 복구. 새 단계 remove → 배열에서 사라짐. 살아 있는 단계가 1개면 remove 무시. move는 gone 단계를 건너뛰고 살아 있는 이웃과 교환, 끝에서는 무시. toggle은 같은 id면 닫힘.
- [ ] **Step 2: 실패 확인 → 구현 → `npm test` PASS**
- [ ] **Step 3: 페이지** — 서버에서 `getLatestDoc(key)` 없으면 `notFound()`. 넘길 props: `doc`, `baseRev`, `usages`, `stale`, `from`(=`safeFrom(searchParams.from)`).
- [ ] **Step 4: 컴포넌트** — 스펙 7.1 그대로. 놓치기 쉬운 것:
  - 작성 칸 Tab/Shift+Tab 두 칸 들여쓰기 — `src/components/tips/tip-editor.tsx:53` 로직을 `src/components/guide-wiki/editor/indent.ts`로 복사(팁 편집기는 손대지 않음)
  - "나란히"는 `sm:` 이상 좌우, 모바일 위아래. 탭 버튼 `aria-pressed`
  - 이동 후 `requestAnimationFrame`으로 같은 카드의 같은 방향 버튼에 포커스 복원. 끝에 닿아 비활성이면 반대 버튼
  - insert 후 새 카드 textarea에 포커스
  - 저장 바: `sticky bottom-16 sm:bottom-0`(MobileNav 위), 진행 중 버튼 "저장하는 중…" + 비활성
  - 충돌: 저장 바 위 경고 + [그 사이 바뀐 점 보기](`/guide-wiki/${key}/diff?from=${baseRev}&to=${latestRev}`, 새 탭) + [내 내용으로 저장](baseRev를 latestRev로 바꿔 다시 `saveGuideEdit`)
  - 성공: `toast.success('버전 ' + revNo + '으로 저장했어요')` → `router.push(from ?? '/guide-wiki/' + key + '/history')`
  - 더러운 상태면 `beforeunload` 경고, 취소는 Dialog 확인
  - `stale`이면 머리 아래 안내 띠 "저장소 원본이 새로 바뀌었어요" + [원본 가져오기](`syncFromSource`, 편집 중 변경이 없을 때만 활성)
- [ ] **Step 5: 확인** — `npx tsc --noEmit && npm run lint && npm test` PASS. 브라우저에서 `/guide-wiki/dev-sample/edit` 로그인 상태로: 추가·삭제·되돌리기·이동·수정·미리보기·전체 미리보기 → 요약 입력 → 저장 → 버전 2(seed=1) 생성 확인(`/history`는 Task 7 전이면 `supabase db query`로 확인). 저장 버튼 연타해도 버전 하나만 생김.
- [ ] **Step 6: Commit** — `feat(guide-wiki): 카드형 단계 편집기`

### Task 7: 고친 기록 + 되돌리기

**Files:**
- Create: `src/app/(nav)/guide-wiki/[key]/history/page.tsx`, `src/components/guide-wiki/history-list.tsx`, `src/components/guide-wiki/revert-dialog.tsx`(client), `src/components/guide-wiki/history-more.tsx`(client, "더 보기")

**Interfaces:**
- Consumes: `getDocMeta`, `listRevisions`, `getRevertedMap`, `isSourceStale`, `revertGuide`, `syncFromSource`, `describeStats`.
- Produces: `RevertDialog` props `{ docKey: string; targetRev: number; latestRev: number; signedIn: boolean }` — Task 8에서도 씀.

- [ ] **Step 1: 페이지** — 원본도 DB도 없으면 `notFound()`. DB 기록이 없으면 원본 한 줄("저장소 원본 · 아직 아무도 안 고쳤어요")만. 스펙 7.2 칩·버튼 규칙. 시각은 date-fns `formatDistanceToNow`(ko) + `title`에 `yyyy-MM-dd HH:mm`. 계정 지워짐 → "탈퇴한 사용자", 링크 없음.
- [ ] **Step 2: 되돌리기 Dialog** — shadcn `Dialog`. 문구는 스펙 7.2 그대로. 비로그인이면 버튼이 `/login?next=` 링크. 성공 시 토스트 "되돌렸어요 — 버전 N으로 기록됐어요" + `router.refresh()`. 충돌이면 "그 사이 새 버전이 저장됐어요. 새로고침한 뒤 다시 시도해 주세요."
- [ ] **Step 3: 확인** — 브라우저: 버전 3개 만든 뒤 버전 1로 되돌리기 → 새 버전 4, "버전 1로 되돌림" 칩, 버전 2·3에 "버전 4에서 되돌려짐" + 취소선. 비로그인 창에서 기록이 보이고 되돌리기는 로그인으로 감.
- [ ] **Step 4: Commit** — `feat(guide-wiki): 고친 기록과 되돌리기`

### Task 8: 두 버전 비교 + 옛 버전 보기

**Files:**
- Create: `src/app/(nav)/guide-wiki/[key]/diff/page.tsx`, `src/components/guide-wiki/step-diff-view.tsx`, `src/components/guide-wiki/fold-step.tsx`(client, 접기/펼치기), `src/app/(nav)/guide-wiki/[key]/rev/[n]/page.tsx`, `src/components/guide-wiki/doc-render.tsx`(모든 단계를 `StepBody`로, 편집기 전체 미리보기와 공용 — Task 6 `whole-preview.tsx`가 이걸 쓰게 바꿈)

**Interfaces:**
- Consumes: `getRevision`, `diffSteps`, `parseRevParam`, `RevertDialog`.

- [ ] **Step 1: diff 페이지** — `to = parseRevParam(sp.to) ?? latest`, `from = parseRevParam(sp.from) ?? to - 1`. `from >= to`, 둘 중 없는 버전, `to === 1 && from 없음`은 `notFound()`. diff는 서버에서 계산. 작성자 카드에 학교 이메일. 줄 기호 `−`/`+`에 `aria-label` "삭제된 줄"/"추가된 줄". 이전/다음 변경 링크는 범위 밖이면 숨김.
- [ ] **Step 2: rev 페이지** — `n` 없으면 `notFound()`. 최신이 아니면 상단 띠 + [이 버전으로 되돌리기](RevertDialog) [지금 버전과 비교](`diff?from=n&to=latest`).
- [ ] **Step 3: 확인** — 브라우저: 추가·삭제·이동·수정이 한 버전에 섞인 비교가 스펙 7.3대로 보임. `/diff?from=3&to=2`, `/rev/999`, `/guide-wiki/nope/history` → 404. 390px 폭·다크모드에서 줄이 가로로 넘치지 않음(`whitespace-pre-wrap break-words`).
- [ ] **Step 4: Commit** — `feat(guide-wiki): 단계 단위 비교와 옛 버전 보기`

### Task 9: 마무리 — 문서·정리·전체 확인

**Files:**
- Modify: `CLAUDE.md`(「🧭 바이브 코딩 가이드」 아래 "가이드 위키식 편집" 소절: 경로 4개, 보호 라우트, `docs/17` 적용됨, 저장 함수 service_role 전용, 어댑터 `source.ts`, dev-sample 비운영, 재작성 세션 연결 대기), 「보호 라우트」 목록에 `/guide-wiki/[key]/edit` 추가, `AGENTS.md` 같은 내용

- [ ] **Step 1: 전체 검사** — `npx tsc --noEmit && npm run lint && npm test && npm run build`. Expected: 전부 성공.
- [ ] **Step 2: 쓰기 거부 확인** — anon 키로 `guide_revisions`에 insert/update/delete 시도하는 일회성 스크립트(scratchpad, 커밋 안 함, `@supabase/supabase-js` + `.env.local`) → 셋 다 실패, 그리고 `rpc('save_guide_revision', …)`도 permission denied.
- [ ] **Step 3: 시험 기록 정리** — `dev-sample` 시험 행 삭제. 사용자에게 먼저 "운영 DB에서 dev-sample 시험 버전 N개를 지울게요"라고 알리고 진행: `supabase db query --linked "DELETE FROM public.guide_revisions WHERE doc_key = 'dev-sample'"`.
- [ ] **Step 4: 재작성 세션에 알림** — `getLatestDoc`·`getDocMeta`·링크 규칙 준비 완료, `source.ts`만 바꾸면 연결된다고 SendMessage.
- [ ] **Step 5: Commit** — `docs: 가이드 위키식 편집 문서화`
