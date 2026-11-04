---
paths:
  - "src/components/guide/**"
  - "src/components/guide-wiki/**"
  - "src/app/**/guide/**"
  - "src/app/**/guide-wiki/**"
  - "src/lib/guide*.ts"
  - "src/lib/guide-wiki/**"
  - "src/content/guides/**"
  - "scripts/gen-guide-fragments.mjs"
  - "src/components/home/guide-teaser.tsx"
---

# 바이브 코딩 가이드·가이드 위키

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

## 🧭 바이브 코딩 가이드 (`/guide`)

만들고 싶은 것에 맞춰 "AI한테 일 시키는 법 → 만들고 돌려 보기 → 인터넷에 올리기 → 이 사이트에 등록"을 한 단계씩 안내하는 기능. 2026-10-24 전면 재작성 — 설계 `docs/superpowers/specs/2026-10-24-guide-rewrite-design.md`.
- **왜 이렇게 생겼나**(사용자): 학생들은 설치는 하지만 ① 채팅이 아니라 에이전트로 들어가기(예: Claude 앱의 Chat 탭에서 만지작거림 — Code 탭으로 가야 함) ② 인터넷에 올리기(GitHub·Vercel·Supabase)에서 막힌다. "이거부터 이렇게 하면 돼"라고 정해 주면 해낸다. 그래서 설치 매뉴얼식·조합별 복붙·선택지 나열 금지, 추천 경로 하나 + 됐다는 신호.

### 위저드 (`src/components/guide/guide-wizard.tsx`, 질문 정의 `src/lib/guide.ts` `GUIDE_STEPS`)
- 질문: **뭘 만들어요(website/app/extension/tool) → (앱이면) 플랫폼(android/apple/mac/windows) → (웹사이트면) 로그인·저장(yes/no/unsure) → AI(claude/chatgpt/gemini/none) → 컴퓨터(windows/mac)**. 터미널 질문·Linux 없음. 옵션 값은 `src/lib/constants.ts` `GUIDE_*`.
- 잠금: apple·mac 앱 → Windows 잠금(Xcode), windows 앱 → Mac 잠금(.NET/WPF). 데스크톱 앱 기술은 Mac=SwiftUI, Windows=C#/.NET WPF.
- `ai=none` → ChatGPT(Codex) 조각으로 추천. Gemini는 옵션에 "만 18세 이상" 표기(Antigravity 연령 제한) + 1장에서 ChatGPT로 바꾸는 링크.
- 동작: 답 스택으로 "이전", "질문 N" 알약, 고른 답 칩, 질문 바뀌면 h2로 포커스. 다 답하면 `/guide/<보이는 답 '/' 연결>`. 홈 `GuideTeaser`의 `/guide?type=`은 `initialType`으로 1번 질문을 미리 답함.
- 가이드 페이지 머리: 흰 바탕 + `.paper-grid` 가운데 스택(purple-600 `BookOpen` 타일 → Plex 제목 → 설명, 모바일은 설명 숨김). 하위 페이지 톤 계획서(Task 9 Step 7)에서 가이드는 빠지고 이 재작성이 직접 반영.

### 결과 스테퍼 (`src/app/(nav)/guide/[...slug]/page.tsx` + `src/components/guide/guide-viewer.tsx`)
- **한 화면에 단계 하나**, 버튼으로 넘김(문서처럼 스크롤 금지 — 사용자 결정). 위 진행 막대 = 장 4칸(누르면 그 장 첫 단계), 장 이름 줄 "N장 · 이름 — i / n", 새 장 첫 단계에 "○○ 끝! 이제 ○○ 차례예요." 띠, 카드 머리 "N-i" 번호 + (3장) 경로 알약 줄, 주 버튼 문구는 단계의 `[!next]`(없으면 "다음"/"N장으로"). 마지막 단계에 "내 프로젝트 등록하기"·"해줘! 둘러보기" 고정 버튼(위키로 편집 안 되게 코드에 둠).
- 진행은 `localStorage['guide-progress:<경로>']`(useSyncExternalStore로 복원, 범위 밖이면 0). 옛 슬러그·잘못된 주소는 `redirect('/guide')`.
- **이어서 보기**(2026-11-01 사용자 요청 — 하다가 나가도 이어서 보게): `GuideViewer`가 단계가 바뀔 때마다 `localStorage['guide-last']`에 마지막으로 본 가이드(경로·제목·단계·장 이름·단계 제목·시각)를 남기고, 위저드(`/guide`) 위에 `GuideResumeCard`("읽다 만 가이드가 있어요" + 진행 막대 + "이어서 보기" → 그 경로, 거기서 `guide-progress`로 같은 단계 복원)가 뜬다. 마지막 단계까지 봤으면 안 뜨고, × 는 기록만 지운다(가이드별 진행은 남음). 읽기·검증은 `src/lib/guide-resume.ts`(`parseGuideResume` — 경로는 `/guide/<slug>`만 받아 링크로 씀, 테스트 `guide-resume.test.ts`). 브라우저에만 저장(DB 없음) — 개인정보 처리방침의 "가이드에서 읽던 위치를 기억해요"에 이미 포함이라 문구는 안 바꿈(바꾸면 전원 재동의).
- 단계 바뀌면 새 h2로 포커스, 카드가 화면 위로 벗어나 있으면 카드 머리로 스크롤.

### 콘텐츠 = 조각 (`src/content/guides/<key>.md`, 작성법 `src/content/guides/README.md`)
- 장 4개 = 조각 18개: `agent-{claude,chatgpt,gemini}` · `build-{website,extension,tool,app-android,app-apple,app-mac,app-windows}` · `ship-{website,website-data,extension,app-android,app-apple,app-desktop,tool}` · `register`. 답 → 조각 매핑은 `planGuide()`, 표시 이름은 `FRAGMENT_TITLES`. 여러 조합이 같은 조각을 공유하고, OS·데이터 차이는 파일을 나누지 않고 `[!only]` 블록으로.
- 형식: `---` 한 줄로 단계 구분, 모든 단계는 `## 제목`으로 시작, `#` 제목·frontmatter·HTML 없음.
- 표기(`src/lib/guide-markup.ts`): `> [!say]`(AI에게 보낼 문장+복사), `> [!ok]`(됐다는 신호), `> [!warn]`, `> [!more] 요약`(접힘), `> [!only os=mac data=no,unsure]`(조건), `> [!next] 문구`, `> [!route] 칸`, 링크 `[글](guide:ai=chatgpt)`(답 하나만 바꾼 가이드, 막힌 조합이면 글자만).
- 렌더러 `GuideStepBody({ body, answers?, aiLabel?, hideTitle? })`(`src/components/guide/guide-step-body.tsx`, 클라이언트 가능). `answers` 없으면(편집기 미리보기) `[!only]`를 "조건: …" 점선 상자로 다 보여 줌.
- **설치 링크 규칙**: 앱/도구 설치 안내 시 "앱스토어에서 검색 후 설치" 식의 텍스트 대신 **반드시 직접 링크**를 제공한다. 주요 링크:
  - Xcode: `[Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)`
  - Windows Terminal: `[Microsoft Store](https://aka.ms/terminal)`
  - Android Studio: `[developer.android.com/studio](https://developer.android.com/studio)`
- **Claude Code(macOS) 설치 블록 표준**: Homebrew 미설치 환경을 고려해 `brew` 명령 사용 금지. 모든 macOS 가이드에서 아래 블록을 동일하게 사용한다(`[!more] 터미널이 편하면` 안).
  ```bash
  # Node.js가 없다면 먼저 설치
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.zshrc
  nvm install --lts && nvm use --lts

  # Claude Code 설치
  npm install -g @anthropic-ai/claude-code
  ```

### 가이드 위키식 편집 (`/guide-wiki/[key]/…`, 2026-10-24)
- 설계: `docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md`, 시안 https://claude.ai/artifact/7Wh7o1TxSvSjf24CK1K3zc (편집기 = 2-B 카드 세로 스택 + 미리보기).
- **누구나 수정**: 로그인한 `@ts.hs.kr` 사용자 누구나 가이드 조각을 고치고 즉시 반영. 관리자 잠금·승인 없음 — 장난 수정은 다른 학생이 되돌린다(사용자 결정).
- **버전**: `public.guide_revisions`(`docs/18-supabase-guide-revisions.sql`, 운영 적용 완료 — migration `20261024120000`·`20261024130000`). 버전은 쓰면 안 바뀐다(RLS SELECT만, 쓰기 정책 없음). 저장은 `save_guide_revision` 함수로만, **EXECUTE는 `service_role` 전용** — 서버 액션(`src/lib/guide-wiki/actions.ts`)이 `getUser()` 확인 후 `createAdminClient()`로 부른다. 작성자 이메일은 `author_email`에 스냅샷.
- ⚠️ `docs/18`은 DROP TABLE을 포함하므로 운영 DB에 다시 실행 금지. 함수 수정은 새 migration으로. 동작 확인은 `docs/18-supabase-guide-revisions-verify.sql`(항상 롤백).
- **원본과 버전 번호**: DB 기록이 없으면 저장소 원본을 버전 0으로 보여 주고, 첫 저장 때 원본을 버전 1(`kind='seed'`)로 남긴 뒤 수정본이 버전 2. 되돌리기는 옛 내용을 새 버전(`kind='revert'`)으로 저장, 원본 가져오기는 `kind='sync'`. 저장소 원본이 바뀌어도 DB 최신이 이기고, 안내 띠로 "원본 가져오기"를 제안.
- **충돌**: 저장 시 `baseRev`가 최신과 다르면 `{ conflict }` — 편집 내용은 유지하고 바뀐 점 보기 / 내 내용으로 저장 선택.
- **화면**: `/guide-wiki`(전체 지도), `/guide-wiki/changes`(최근 바뀜), `edit`(보호, 카드 스택·작성/나란히/미리보기·전체 미리보기·하단 저장 바·요약 필수), `history`(작성자·요약·글자 수·"버전 K로 되돌림"/"버전 R에서 되돌려짐" 칩·되돌리기 Dialog), `diff?from&to`(단계 단위 + 줄 diff, `?source=1`은 최신 vs 저장소 원본), `rev/[n]`(옛 버전 보기). 모두 `force-dynamic`.
- **가이드 연결점**: 가이드 조각(`src/content/guides/<key>.md`)과는 `src/lib/guide-wiki/source.ts` 한 파일로만 닿는다 — `loadSourceDoc` = `getFragment`, `listUsages` = `guide-content.ts`의 역색인 (개발에서는 `dev-sample` 조각도 추가). `loadGuide`는 장마다 `getLatestDoc(key)`(DB 최신 ?? 원본)와 `getDocMeta(key)`를 읽고, 결과 화면의 `GuideChapterTools`가 장 이름 줄 오른쪽에 "고치기"(`/guide-wiki/<key>/edit?from=<현재 경로>`)·"기록" 링크와 "마지막 수정" 정보를 단다. 단계 본문 렌더는 `src/components/guide-wiki/step-body.tsx` → `GuideStepBody`(answers 없이 → `[!only]`는 조건 상자로 다 보임).
- **전체 지도 `/guide-wiki`·최근 바뀜 `/guide-wiki/changes`**(2026-11-04 사용자 요청): ① 누가 망쳐도 그 가이드에 들어가 보기 전엔 방치됐다 → 모든 조각의 기록을 최신순 한 목록(`listRecentChanges`, `kind='seed'` 자동 원본은 뺌, `created_at` 키셋 "더 보기" `loadMoreRecentChanges`), 줄마다 조각 이름·바뀐 점·되돌리기(`HistoryRow`의 `docTitle`). ② 위저드를 끝까지 답해야만 고칠 수 있었다 → 장별 조각 카드 지도(`listGuideMap` = `planGuide` 역색인, "가이드 N곳에 쓰여요", 마지막 수정 `listDocSummaries` 한 번에 읽기), 고치기는 `?from=/guide-wiki`. 여러 조각을 한 화면에서 동시에 고치는 편집기는 안 만든다(사용자 확인) — 같은 내용은 한 조각에만 있어서(예: Claude Code 설명은 `agent-claude`뿐) 한 번 고치면 쓰는 가이드 전부에 반영. 편집기 머리 칩은 "여기를 고치면 가이드 N곳이 한꺼번에 바뀌어요"(`DocHeader editing`). 입구: `/guide` 위저드 아래 줄, 결과 화면 장 이름 줄의 "전체"(지도 아이콘).
- 순수 로직(`steps`·`diff`·`params`·`schema`·`format`·편집기 `reducer`)은 상대 `.ts` import만 쓰고 `npm test`(`node --test`)로 검증.
