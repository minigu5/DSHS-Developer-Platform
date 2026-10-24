# 바이브 코딩 가이드 재작성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/guide` 위저드 질문을 5개(종류·플랫폼·데이터·AI·OS)로 바꾸고, 결과를 장 4개(= 조각 18개)의 한 단계씩 넘기는 스테퍼로 다시 만든다.

**Architecture:** 순수 TS 모듈 두 개(`src/lib/guide.ts` 질문·장 매핑, `src/lib/guide-markup.ts` 단계 마크업 해석)가 규칙을 갖고, 서버 로더(`guide-content.ts`)가 조각 파일을 읽어 `WikiDoc` 모양으로 넘기며, 클라이언트 `GuideViewer`가 단계를 넘기고 `GuideStepBody`가 상자·조건·링크를 그린다.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4, react-markdown + remark-gfm, lucide-react. 새 의존성 없음.

**Spec:** `docs/superpowers/specs/2026-10-24-guide-rewrite-design.md`

## Global Constraints

- 새 npm 의존성 추가 금지. 원본 HTML 렌더(`rehype-raw`) 금지.
- 조각 key 정규식 `^[a-z0-9][a-z0-9-]{0,99}$`, 파일 `src/content/guides/<key>.md`.
- `transition-all`·`hover:scale-*`·그라디언트 글자·블롭·글래스·eyebrow 알약 금지(CLAUDE.md Design System).
- 흰 글자 배경은 purple-600·blue-600 이상. 회색 본문 zinc-500 이상. 다크 긴 글은 zinc-900 카드 + zinc-300 글자.
- 모바일 좌우 여백 `px-6`, 카드 `p-6 sm:p-8`, 데스크탑(`sm:`) 우선 유지 패턴.
- 카피 해요체, 이모지 없음, 로딩 문구 `…`.
- `localStorage` 접근은 전부 try/catch.
- `PROJECT_TYPES`·탐색/프로젝트 아이콘 맵은 건드리지 않는다.

## Review Focus

1. 옛 슬러그(`/guide/website/terminal/claude-code/mac` 등)나 아무 문자열 → 404가 아니라 `/guide`로 redirect. → Task 5 확인 단계.
2. 막힌 조합으로 바꾸는 `guide:` 링크(예: Apple 앱 가이드에서 `guide:os=windows`) → 링크 대신 글자만. → Task 2 테스트 `resolveGuideHref blocked`.
3. 위키에서 단계를 지워 단계 수가 줄었는데 `localStorage`에 큰 번호가 남은 경우 → 범위 밖이면 0으로. → Task 5 Step 2.
4. 조합 하나라도 조각 파일이 없으면 결과 화면이 비는 문제 → 모든 조합의 key에 파일이 있는지 검사. → Task 7 테스트 `every planned fragment exists`.
5. `[!only]`·`[!next]`·`[!route]` 표기를 잘못 쓴 경우(모르는 종류, 빈 라벨, 인용문 안 빈 줄) → 에러 없이 일반 인용문/무시. → Task 2 테스트.

## 테스트 방식

저장소에 테스트 러너가 없다(추가하지 않음). 순수 TS 모듈은 세션 scratchpad의 `node --test` 스크립트로 검사한다. Node 26은 `.ts`를 바로 실행하므로, `@/` 별칭만 scratchpad의 resolve 훅(`alias.mjs`)으로 `src/`에 잇는다. 이 테스트 파일은 커밋하지 않는다. 화면은 `npx tsc --noEmit`, `npm run lint`, 브라우저 확인.

---

### Task 1: 질문·장 규칙 (`src/lib/constants.ts`, `src/lib/guide.ts`)

**Files:**
- Modify: `src/lib/constants.ts:82-125` (GUIDE_* 교체)
- Modify: `src/lib/guide.ts` (전체 재작성)

**Interfaces:**
- Produces:
  - constants: `GUIDE_PROGRAM_TYPES`(website/app/extension/tool), `GUIDE_APP_PLATFORMS`(android/apple/mac/windows), `GUIDE_DATA`(yes/no/unsure), `GUIDE_AI_TOOLS`(claude/chatgpt/gemini/none), `GUIDE_OS`(windows/mac). 각 `{ value, label, desc }` + 값 타입. `GUIDE_TERMINAL`·`GUIDE_ANDROID_GEMINI_TOOL` 삭제. `GUIDE_AI_LABELS: Record<'claude'|'chatgpt'|'gemini', string>` = Claude/ChatGPT/Gemini.
  - guide.ts: 기존 `GuideAnswers`, `GuideOption`, `GuideStep`, `GUIDE_STEPS`, `visibleSteps`, `buildSlug`, `GuidePick`, `picksToAnswers`, `resolveSlug` 이름 유지. 추가:
    - `isBlocked(answers: GuideAnswers): boolean` — 어느 단계든 `disabledReason`이 걸리면 true
    - `GUIDE_CHAPTERS: readonly { no: 1|2|3|4; name: string }[]` — 이름: "AI를 에이전트로 쓰기", "만들고 돌려 보기", "인터넷에 올리기", "이 사이트에 등록하기"
    - `type GuideChapterPlan = { no: number; name: string; key: string; title: string }`
    - `type GuidePlan = { title: string; aiKey: 'claude'|'chatgpt'|'gemini'; recommended: boolean; chapters: GuideChapterPlan[] }`
    - `planGuide(answers: GuideAnswers): GuidePlan` — 스펙 §5.1 매핑. `ai=none` → `aiKey='chatgpt'`, `recommended=true`. `data` yes → `ship-website-data`, no/unsure → `ship-website`. platform mac/windows → `ship-app-desktop`.
    - `FRAGMENT_TITLES: Record<string, string>` — 18개 key → 표시 이름(예: `agent-claude` "1장 · Claude로 에이전트 쓰기")
    - `allGuideAnswers(): GuideAnswers[]` — 막히지 않은 모든 완성 조합
    - `swapAnswer(answers: GuideAnswers, key: string, value: string): string | null` — 그 key만 바꾸고, 바꾼 뒤 안 보이게 된 단계 답은 지우고, 새로 보이는 단계가 답이 없거나 막히면 null, 아니면 `/guide/${buildSlug(next)}`
- 결과 제목(`GuidePlan.title`): website "웹사이트 만들어서 올리기", extension "확장프로그램 만들어서 나눠 주기", tool "도구 만들어서 공개하기", app+android "Android 앱 만들어서 친구에게 주기", app+apple "iPhone·iPad 앱 만들어서 친구에게 주기", app+mac "Mac 앱 만들어서 나눠 주기", app+windows "Windows 앱 만들어서 나눠 주기".
- 질문 제목·부제·옵션 라벨·설명: 시안 보드 1(`Main.dc.html`)과 스펙 §3 그대로. 비활성 이유 두 개는 스펙 §3 문구 그대로.

- [ ] **Step 1: 실패하는 테스트 작성** — `<scratchpad>/guide-tests/guide.test.ts`

```ts
test('resolveSlug: website 4 segments', () => assert.equal(resolveSlug(['website','yes','claude','mac'])?.length, 4));
test('resolveSlug: old slug fails', () => assert.equal(resolveSlug(['website','terminal','claude-code','mac']), null));
test('resolveSlug: apple + windows blocked', () => assert.equal(resolveSlug(['app','apple','claude','windows']), null));
test('resolveSlug: windows app + mac blocked', () => assert.equal(resolveSlug(['app','windows','claude','mac']), null));
test('planGuide: none → chatgpt recommended', () => { const p = planGuide({type:'tool',ai:'none',os:'mac'}); assert.equal(p.aiKey,'chatgpt'); assert.equal(p.recommended,true); assert.deepEqual(p.chapters.map(c=>c.key),['agent-chatgpt','build-tool','ship-tool','register']); });
test('planGuide: unsure → ship-website', () => assert.equal(planGuide({type:'website',data:'unsure',ai:'claude',os:'mac'}).chapters[2].key,'ship-website'));
test('planGuide: mac app → ship-app-desktop', () => assert.equal(planGuide({type:'app',platform:'mac',ai:'gemini',os:'mac'}).chapters[2].key,'ship-app-desktop'));
test('allGuideAnswers: count', () => assert.equal(allGuideAnswers().length, 60));
test('swapAnswer: ai swap', () => assert.equal(swapAnswer({type:'website',data:'no',ai:'gemini',os:'windows'},'ai','chatgpt'),'/guide/website/no/chatgpt/windows'));
test('swapAnswer: blocked → null', () => assert.equal(swapAnswer({type:'app',platform:'apple',ai:'claude',os:'mac'},'os','windows'), null));
test('FRAGMENT_TITLES covers all planned keys', () => { for (const a of allGuideAnswers()) for (const c of planGuide(a).chapters) assert.ok(FRAGMENT_TITLES[c.key], c.key); });
```

`allGuideAnswers` 개수는 직접 세어 고정한다: website 3(data)×4(ai)×2(os)=24, extension 4×2=8, tool 8, android 8, apple 4×1=4, mac 4, windows 4 → **60**.

- [ ] **Step 2: 실행해 실패 확인** — `node --import <scratchpad>/guide-tests/alias.mjs --test <scratchpad>/guide-tests/guide.test.ts` → FAIL(`planGuide` 없음 등)
- [ ] **Step 3: 구현** (constants·guide.ts)
- [ ] **Step 4: 테스트 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: tsc** — `npx tsc --noEmit`은 아직 위저드·뷰어가 옛 상수를 써서 실패할 수 있음. Task 1~6을 한 커밋으로 묶으므로 여기선 이 두 파일의 에러만 없는지 본다.

### Task 2: 단계 마크업 해석 (`src/lib/guide-markup.ts`)

**Files:**
- Create: `src/lib/guide-markup.ts` (순수 TS, React·fs import 금지)

**Interfaces:**
- Consumes: `swapAnswer`, `GuideAnswers` (Task 1)
- Produces:
  - `type CalloutKind = 'say'|'ok'|'warn'|'more'|'only'`
  - `type StepSegment = { kind: 'md'; text: string } | { kind: CalloutKind; label: string; text: string }`
  - `parseStepMeta(body: string): { title: string | null; next: string | null; route: string | null }` — 첫 `#`/`##` 헤딩 글자, `> [!next] 문구`, `> [!route] 칸`
  - `splitSegments(body: string): StepSegment[]` — 줄 단위. `>`로 시작하는 연속 줄 묶음의 첫 줄이 `> [!종류]( 라벨)?`이고 종류가 알려진 것이면 callout(본문은 각 줄 앞 `> ?`를 뗀 나머지), `next`·`route`는 결과에서 뺌, 모르는 종류는 원문 그대로 `md`에 합침. 코드 펜스(```) 안의 `>`는 건드리지 않음.
  - `matchesCondition(label: string, answers: GuideAnswers | undefined): boolean` — `os=mac data=no,unsure` 형식, 모든 항 AND, 값 `,`는 OR, 모르는 key는 true, `answers` 없으면 true
  - `resolveGuideLinks(text: string, answers: GuideAnswers | undefined): string` — `[글](guide:k=v)` → `swapAnswer` 결과가 있으면 `[글](/guide/...)`, 없거나 answers 없으면 `글`
  - `splitFragmentSteps(md: string): string[]` — `^\s*---\s*$` 기준 분리·trim·빈 것 제거(코드 펜스 안 `---`는 분리 안 함)
  - `routeOf(steps: string[]): string[]` — 각 단계 `parseStepMeta().route`를 처음 나온 순서로 중복 없이

- [ ] **Step 1: 실패하는 테스트** — `<scratchpad>/guide-tests/markup.test.ts`

```ts
test('parseStepMeta', () => assert.deepEqual(parseStepMeta('## 폴더 정하기\n본문\n> [!next] 됐어요, 다음\n> [!route] GitHub'), { title: '폴더 정하기', next: '됐어요, 다음', route: 'GitHub' }));
test('parseStepMeta: none', () => assert.deepEqual(parseStepMeta('본문만'), { title: null, next: null, route: null }));
test('splitSegments: say box', () => assert.deepEqual(splitSegments('앞\n\n> [!say]\n> 만들어 줘\n\n뒤').map(s => s.kind), ['md','say','md']));
test('splitSegments: label', () => { const s = splitSegments('> [!warn] 안 하면\n> 튕겨요')[0]; assert.equal(s.kind,'warn'); assert.equal(s.label,'안 하면'); assert.equal(s.text,'튕겨요'); });
test('splitSegments: unknown kind stays md', () => assert.deepEqual(splitSegments('> [!foo]\n> 글').map(s=>s.kind), ['md']));
test('splitSegments: next/route removed', () => assert.equal(splitSegments('글\n> [!next] 다음').filter(s=>s.kind!=='md').length, 0));
test('splitSegments: fence untouched', () => assert.deepEqual(splitSegments('```\n> [!say]\n```').map(s=>s.kind), ['md']));
test('matchesCondition', () => { assert.equal(matchesCondition('os=mac', {os:'mac'}), true); assert.equal(matchesCondition('os=mac', {os:'windows'}), false); assert.equal(matchesCondition('data=no,unsure', {data:'unsure'}), true); assert.equal(matchesCondition('zzz=1', {os:'mac'}), true); assert.equal(matchesCondition('os=mac', undefined), true); });
test('resolveGuideLinks ok', () => assert.equal(resolveGuideLinks('[바꾸기](guide:ai=chatgpt)', {type:'tool',ai:'gemini',os:'mac'}), '[바꾸기](/guide/tool/chatgpt/mac)'));
test('resolveGuideLinks blocked', () => assert.equal(resolveGuideLinks('[윈도우](guide:os=windows)', {type:'app',platform:'apple',ai:'claude',os:'mac'}), '윈도우'));
test('resolveGuideLinks no answers', () => assert.equal(resolveGuideLinks('[바꾸기](guide:ai=chatgpt)', undefined), '바꾸기'));
test('splitFragmentSteps: fence', () => assert.equal(splitFragmentSteps('## a\n```\n---\n```\n---\n## b').length, 2));
test('routeOf', () => assert.deepEqual(routeOf(['> [!route] GitHub','> [!route] Vercel','> [!route] Vercel']), ['GitHub','Vercel']));
```

- [ ] **Step 2: 실패 확인** — `node --import <alias> --test <scratchpad>/guide-tests/markup.test.ts` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS

### Task 3: 서버 로더 (`src/lib/guide-content.ts`)

**Files:**
- Modify: `src/lib/guide-content.ts` (전체 재작성)

**Interfaces:**
- Consumes: `planGuide`, `allGuideAnswers`, `buildSlug`, `resolveSlug` 계열, `FRAGMENT_TITLES`, `GUIDE_STEPS`(칩 라벨용) (Task 1), `splitFragmentSteps` (Task 2)
- Produces:
  - `type GuideFragment = { key: string; title: string; steps: { id: string; body: string }[]; extra: null }` (6f `WikiDoc`과 같은 모양)
  - `getFragment(key: string): Promise<GuideFragment | null>` — key 정규식 검사 후 파일 읽기, 단계 id `s1`… 순서대로, 파일 없으면 null
  - `listUsages(key: string): Promise<{ label: string; href: string }[]>` — 그 key를 쓰는 모든 조합. label은 보이는 단계 옵션 라벨을 ` · `로 연결, href `/guide/<slug>`
  - `type LoadedChapter = GuideChapterPlan & { steps: { id: string; body: string }[] }`
  - `loadGuide(answers: GuideAnswers): Promise<{ plan: GuidePlan; chapters: LoadedChapter[] }>` — 조각이 없거나 단계 0개인 장은 빼고 반환
- 6f의 `getLatestDoc`이 main에 생기면 `loadGuide` 안에서 `getFragment` 대신 쓰도록 한 줄 바꿀 자리에 주석을 남긴다.

- [ ] **Step 1: 실패 테스트** — `<scratchpad>/guide-tests/content.test.ts`: `getFragment('../etc')` → null, `getFragment('nope')` → null, `listUsages('register')` 길이 60, `listUsages('agent-claude')`의 모든 href가 `/claude/`를 포함.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** → PASS (파일 존재 검사는 Task 7)

### Task 4: 단계 렌더러 (`GuideStepBody`)

**Files:**
- Create: `src/components/guide/guide-step-body.tsx` (`"use client"`)
- Modify: `src/components/shared/markdown.tsx` — `a`: `href`가 `/`로 시작하면 `target`·`rel` 없이(같은 탭). 나머지는 그대로.

**Interfaces:**
- Consumes: `splitSegments`, `matchesCondition`, `resolveGuideLinks`, `parseStepMeta` (Task 2), `Markdown`
- Produces: `GuideStepBody({ body, answers?, aiLabel? }: { body: string; answers?: GuideAnswers; aiLabel?: string })`, 그리고 `export { parseStepMeta } from "@/lib/guide-markup"` (6f 약속)
- 그리기:
  - 첫 `#`/`##` 헤딩 줄은 본문에서 빼고 뷰어가 제목으로 그린다(렌더러는 `hideTitle?: boolean` prop, 기본 false — 편집기는 제목 포함 미리보기).
  - `md` → `<Markdown>` (모든 텍스트는 먼저 `resolveGuideLinks`)
  - `say` → 회색 상자, 위 줄 "`{aiLabel ?? 'AI'}`에게 이렇게 말해요" + "복사" 버튼(`navigator.clipboard.writeText(text)`; 성공 시 1.5초 "복사했어요", 실패 시 아무것도 안 함; `aria-label="요청 문장 복사"`). 본문 `<Markdown>`.
  - `ok` → emerald 상자, 라벨 기본 "됐다는 신호"(`label` 있으면 그것), `Check` 아이콘 aria-hidden
  - `warn` → amber 상자, 라벨 기본 "주의"
  - `more` → `<details>`(테두리 rounded-[14px]), `<summary>`=label(없으면 "더 보기"), 안쪽 `<Markdown>`
  - `only` → `answers` 있으면 조건 맞을 때만 본문 그대로, 없으면 점선 테두리 상자 + 작은 라벨 "조건: {label}"
  - 색: emerald `bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200`, amber 같은 패턴, say `bg-zinc-50 border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800`. 상자 안 `Markdown`의 p 색이 상자 글자색을 덮지 않게 상자에 `[&_p]:text-inherit [&_p]:mb-0 [&_p+p]:mt-2`.

- [ ] **Step 1: tsc** — `npx tsc --noEmit` 이 파일 에러 0
- [ ] **Step 2: lint** — `npx eslint src/components/guide/guide-step-body.tsx src/components/shared/markdown.tsx` → 0 errors

### Task 5: 결과 스테퍼 (`GuideViewer`, 결과 페이지)

**Files:**
- Modify: `src/components/guide/guide-viewer.tsx` (전체 재작성, `"use client"`)
- Create: `src/components/guide/guide-chapter-tools.tsx` — `GuideChapterTools({ fragmentKey, from }: { fragmentKey: string; from: string })`, 지금은 `return null`(위키 기능이 채움). 주석으로 6f 설계 §7.5 경로 남김.
- Modify: `src/app/(nav)/guide/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `loadGuide` (Task 3), `GuideStepBody`·`parseStepMeta` (Task 4), `routeOf` (Task 2), `GUIDE_AI_LABELS`
- Produces: `GuideViewer({ storageKey, chapters, answers, aiLabel, recommendedNote }: { storageKey: string; chapters: LoadedChapter[]; answers: GuideAnswers; aiLabel: string; recommendedNote: string | null })`
- 페이지: `resolveSlug` 실패 → `redirect('/guide')`. `generateMetadata` → `${plan.title} — DSHS Developer Platform`. 바탕 흰색(`bg-white dark:bg-zinc-950`), `main max-w-3xl px-6 py-8`. 칩(`bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300`, h-7 rounded-full text-xs font-semibold) + 오른쪽 "다시 고르기" 링크, h1 `font-heading text-3xl sm:text-4xl`. `recommendedNote`는 `plan.recommended`일 때 "무료로 시작할 수 있는 ChatGPT(Codex)로 골랐어요."
- 뷰어 동작(스펙 §4, 시안 보드 2 `Result.dc.html` 기준):
  - 단계 평탄화: 장마다 단계 목록 → 전체 인덱스. 상태 `index`.
  - 진행 막대 `grid grid-cols-4 gap-2`, 칸 = `<button>`(장 첫 단계로), 막대 h-1.5, 채움 purple-600 (지난 장 100%, 지금 장 `(장 안 순번)/(장 단계 수)`, 앞 장 0), 라벨 `hidden sm:block`은 "N. 이름", 모바일은 "N"만. 지금 장 `aria-current="step"`. 막대 채움은 `transition-[width]`.
  - 장 이름 줄: "N장 · 이름 — i / n" + `<GuideChapterTools fragmentKey from={pathname}/>`
  - 새 장 첫 단계 && 장 번호 > 1: 띠 "{이전 장 이름} 끝! 이제 {장 이름} 차례예요." (`Check` emerald 아이콘, zinc-100 배경). 1장 첫 단계 && `recommendedNote` 있으면 그 문구 띠.
  - 카드: `rounded-3xl border p-6 sm:p-8`, 맨 위 `N-i`(purple-700 text-sm font-semibold), 조각에 route가 있으면 경로 알약 줄(지난 칸 zinc-900 테두리, 지금 칸 purple-600 채움 흰 글자, 앞 칸 zinc-300 테두리 zinc-500 글자), 제목 h2 `font-heading text-2xl sm:text-[26px]`(`tabIndex={-1}`, 전환 시 focus), 본문 `<GuideStepBody body answers aiLabel hideTitle/>`.
  - 아래 줄: "이전"(ghost 알약, 첫 단계 disabled) / 주 버튼 purple-600 h-12 rounded-full: 문구 = `[!next]` ?? (장 마지막 단계면 `${다음 장 번호}장으로` : "다음"). 마지막 단계면 주 버튼 대신 링크 "다른 걸 만들어 볼래요"(`/guide`).
  - 마지막 단계 카드 아래 버튼 2개: "내 프로젝트 등록하기"(`/projects/new`, `bg-blue-600 hover:bg-blue-700 text-white`) · "해줘! 둘러보기"(`/haejwo`, outline).
  - 전환: 새 단계 h2로 `focus({ preventScroll: true })`, 카드 top이 뷰포트 위(< 80px)에 있으면 `scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })`. 카드에 `key={index}` + `animate-in fade-in duration-200 motion-reduce:animate-none`.
  - 저장: `localStorage['guide-progress:' + storageKey] = index`. 마운트 시 읽어 `0 ≤ n < total`이면 복원, 아니면 0. 모든 접근 try/catch.
- [ ] **Step 1: tsc·lint** 이 파일들 0 에러
- [ ] **Step 2: 브라우저 확인**(Task 8에서 몰아서): 진행 복원(범위 밖 값 → 0), 장 전환 띠, `[!next]` 문구, 3장 경로 줄, 옛 슬러그 redirect

### Task 6: 위저드·가이드 페이지·홈 미리보기

**Files:**
- Modify: `src/components/guide/guide-wizard.tsx`
- Modify: `src/app/(nav)/guide/page.tsx`
- Modify: `src/components/home/guide-teaser.tsx`

**Interfaces:**
- Consumes: `GUIDE_STEPS` (Task 1)
- 위저드: 동작(답 스택·이전·포커스·`initialType`)은 유지. `STEP_OPTION_ICONS` 새 값으로: type(website Globe, app Smartphone, extension Puzzle, tool Terminal), platform(android Smartphone, apple Tablet, mac Laptop, windows Monitor), data(yes Check, no Minus, unsure HelpCircle), ai(claude/chatgpt/gemini Sparkles, none HelpCircle), os(windows Monitor, mac Laptop). 옵션 행 아이콘 타일 `bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300`, hover 테두리 purple-300. 단계 표시는 "질문 N" 알약(`bg-purple-100 text-purple-700 …`). 답한 칩 줄(위저드 h2 위, zinc-100 알약).
- 가이드 페이지 머리: 흰 바탕, `.paper-grid` 섹션 가운데 스택(purple-600 아이콘 타일 56px `rounded-2xl` 흰 `Rocket` → h1 "나도 개발해볼래!" `font-heading` → 설명 "질문 몇 개에 답하면, AI한테 일 시키는 법부터 인터넷에 올리는 법까지 내 상황에 맞는 순서로 알려 줘요."), 그 아래 `main max-w-2xl px-6 py-10`.
- 홈 미리보기: `TYPE_ICONS`에서 cli·library → `tool: Terminal`, 소개 문구 "만들고 싶은 것과 쓰는 컴퓨터를 고르면 AI한테 일 시키는 법부터 인터넷에 올리는 법까지 단계별로 알려줘요."
- `PageNav`의 가이드 아이콘이 `Rocket`이 아니면 페이지 타일 아이콘도 PageNav 것과 같은 걸로 쓴다.
- [ ] **Step 1: `grep -rn "GUIDE_TERMINAL\|GUIDE_ANDROID_GEMINI_TOOL\|claude-code\|chatgpt-codex" src`** → 0건(콘텐츠 md 제외)
- [ ] **Step 2: `npx tsc --noEmit`** → 0 에러, **`npm run lint`** → 새 에러 0
- [ ] **Step 3: Commit** (Task 1~6)

```bash
git add src/lib/constants.ts src/lib/guide.ts src/lib/guide-markup.ts src/lib/guide-content.ts src/components/guide src/components/shared/markdown.tsx "src/app/(nav)/guide" src/components/home/guide-teaser.tsx
git commit -m "feat(guide): 질문 5개 위저드와 장 4개 스테퍼로 가이드 재구성"
```

### Task 7: 조각 18개 + 작성법

**Files:**
- Delete: `src/content/guides/*.md` 옛 25개
- Create: `src/content/guides/{agent-claude,agent-chatgpt,agent-gemini,build-website,build-extension,build-tool,build-app-android,build-app-apple,build-app-mac,build-app-windows,ship-website,ship-website-data,ship-extension,ship-app-android,ship-app-apple,ship-app-desktop,ship-tool,register}.md`
- Rewrite: `src/content/guides/README.md`

**Interfaces:**
- Consumes: 표기 규칙(Task 2·스펙 §5.3), 쓰는 원칙(스펙 §5.4), 경로(스펙 §5.5), 시안 보드 2 문구(Claude·웹사이트 기준 톤)
- 단계 수 목표: agent 3~4, build 3~4, ship 2~5, register 1. 모든 단계 `## 제목`으로 시작, 가능한 단계마다 `[!ok]`·`[!next]`.
- 사실은 공식 문서로 다시 확인. 확인 못 한 메뉴 이름은 "설정에서 ○○ 찾기"처럼 일반화.
- `agent-gemini` 첫 단계 맨 위: `[!warn]` 만 18세 이상·학교 계정 불가 + `[ChatGPT로 바꿔 고르기](guide:ai=chatgpt)`. `agent-claude` 1단계: Pro 이상 `[!warn]` + `[ChatGPT(Codex)로 바꿔 고르기](guide:ai=chatgpt)`.
- `ship-website` 마지막 단계: `> [!only data=unsure]` 안에 "로그인이 필요해졌다면 [로그인·저장 있는 가이드](guide:data=yes)".
- macOS 터미널 설치는 CLAUDE.md 표준 블록 그대로, `[!more] 터미널이 편하면` 안.

- [ ] **Step 1: 실패 테스트** — `<scratchpad>/guide-tests/fragments.test.ts`: 모든 `allGuideAnswers()` × `planGuide().chapters`의 key에 대해 `getFragment(key)`가 null이 아니고 `steps.length ≥ 1`, 모든 단계가 `parseStepMeta().title`을 가짐, 모든 `guide:` 링크의 key가 `GUIDE_STEPS` key 중 하나, `src/content/guides`에 18개 + README 외 파일 없음.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 옛 파일 삭제, 조각 18개·README 작성**
- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add -A src/content/guides && git commit -m "docs(guide): 장별 조각 18개로 가이드 콘텐츠 재작성"`

### Task 8: 문서·브라우저 확인·마무리

**Files:**
- Modify: `CLAUDE.md` 「🧭 바이브 코딩 가이드」 절 전체, 「🗂️ 현재 디렉토리 구조」의 guide 줄, 홈 구성의 GuideTeaser 설명
- Modify: `AGENTS.md`(가이드 언급 있으면 동일 반영)

- [ ] **Step 1: CLAUDE.md 갱신** — 새 질문 5개, 장 4개=조각, 파일 형식·표기 표, 스테퍼 동작, 6f 위키 접점(`GuideStepBody`, `getFragment`, `listUsages`, `GuideChapterTools`), 톤 계획서에서 가이드 제외.
- [ ] **Step 2: 브라우저 확인** — `npm run dev` 후(본인 PID만 관리), playwright-cli로: `/guide` 모든 분기(앱 4종 플랫폼 잠금 2개 포함), `/guide/website/yes/claude/mac` 11단계 넘기기·새로고침 복원·장 전환 띠·3장 경로 줄·복사 버튼, `/guide/app/apple/gemini/mac`(Gemini 경고·`guide:` 링크), `/guide/website/terminal/claude-code/mac` → `/guide`, 모바일 390px·다크 스크린샷.
- [ ] **Step 3: `npx tsc --noEmit`·`npm run lint`** → 0 / 새 에러 0
- [ ] **Step 4: Commit** — `git commit -m "docs: 가이드 재작성 반영해 CLAUDE.md 갱신"` (스펙·계획 문서도 함께)
- [ ] **Step 5: 6f 세션에 알림** — 커밋 해시, `getFragment`/`listUsages`/`GuideStepBody`/`GuideChapterTools` 위치
