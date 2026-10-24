# 바이브 코딩 가이드(`/guide`) 전면 재작성 — 설계

- 날짜: 2026-10-24
- 시안: https://claude.ai/artifact/UvVc2rugRqqCGce5YACW3n (보드 1 위저드, 보드 2 결과 스테퍼, 보드 3 종류별 배포 경로)
- 관련 설계: `docs/superpowers/specs/2026-10-24-guide-wiki-editing-design.md`(다른 세션 6f, 가이드 위키 편집), `docs/superpowers/specs/2026-10-24-subpage-tone-design.md`(하위 페이지 톤)

## 1. 왜 다시 만드나

사용자 말(2026-10-24):

- "좀 실제 사람들의 흐름에 맞으면 좋겠어. 그리고 현재는 겹치는 부분이 너무 많고 솔직히 가이드라기에는 너무 뻔해."
- "설치는 누구나 하는데, 실행하는 거를 잘 못하는 경우가 많더라고. 예를 들어 claude desktop은 code로 들어가야 에이전트로 실행이 되잖아. 근데, 채팅에서 만지작 거리고 있더라고."
- 내 컴퓨터에서 띄워 보기는 "괜찮던데", "실제로 상용화(인터넷에 올리는 부분)을 잘 못하는 학생들이 많은 것 같아. supabase, vercel, github, cloudflare 이런 게 좀 어렵잖어"
- "솔직히 뭐를 해야 하는지 몰라서 시도를 안 해보지, 내가 이거부터 이렇게 하면 돼라고 하면 대부분 해당 서비스로 시도해서 성공하기는 하더라"

지금 `src/content/guides/*.md` 25개는 "Node 설치 → 도구 설치 → 로그인 → 투두리스트 요청 → 요령 4줄" 틀을 조합마다 복붙했다. 설치 매뉴얼에서 끝나고, 학생이 실제로 막히는 두 곳(① 채팅이 아니라 에이전트로 들어가기, ② 인터넷에 올리기)은 거의 다루지 않는다.

## 2. 목표 / 비목표 / 실패 조건

**목표**

- 학생이 "다음에 뭘 해야 하지?"에서 멈추지 않게 한다. 한 화면에 할 일 하나, 성공했는지 알 수 있는 신호, 다음 버튼.
- 무게중심: 1장 에이전트로 들어가기, 3장 인터넷에 올리기. 설치는 짧게.
- 배포는 내 상황에 맞는 **추천 경로 하나**를 단정적으로 안내한다(선택지 나열 금지).
- 같은 글을 여러 번 쓰지 않는다. 장 = 조각, 조각은 여러 조합이 공유한다.
- 학생들이 가이드를 직접 고칠 수 있는 위키 기능(6f 세션)과 단위가 맞는다.

**비목표**

- 서비스 화면을 클릭 단위로 캡처해 따라 하게 하는 튜토리얼. 화면은 금방 바뀐다. 단계의 목표와 확인 신호를 우선한다.
- 진행 상태의 서버 저장(로그인 사용자별 진도). 브라우저 저장만.
- Linux 지원. 질문에서 뺀다.

**실패 조건(돌아가도 실패)**

- 결과가 긴 문서 한 장처럼 스크롤로 보이는 것. 사용자: "저렇게 문서처럼 만들거는 아니지? 실제로는 학생이 버튼 누르면 가이드가 1 → 2 이렇게 넘어가지?"
- 조합마다 거의 같은 파일이 다시 생기는 것.
- "어떤 서비스를 쓸지는 취향에 따라…" 같은 비교 나열.
- 홈 리뉴얼에서 걷어낸 AI 템플릿 느낌 요소(CLAUDE.md 「Design System」 금지 목록)를 다시 쓰는 것.

## 3. 질문 흐름 (위저드)

사용자가 승인한 질문 세트("그렇게 해보자. 좋다!"). 결과가 실제로 달라지는 질문만 둔다. "터미널 사용" 질문과 "Android Gemini 개발 방식" 질문은 없앤다.

| 순서 | key | 질문 | 보이는 조건 | 옵션 (value · 라벨 · 설명) |
|---|---|---|---|---|
| 1 | `type` | 뭘 만들고 싶어요? | 항상 | `website` 웹사이트 · `app` 앱 · `extension` 확장프로그램 · `tool` 그 밖의 도구(CLI·라이브러리 합침) |
| 2 | `platform` | 어디서 돌아가는 앱이에요? | `type=app` | `android` Android · `apple` iPhone·iPad · `mac` Mac · `windows` Windows |
| 3 | `data` | 로그인하거나 뭔가를 저장하나요? | `type=website` | `yes` 있어요 · `no` 없어요 · `unsure` 잘 모르겠어요 |
| 4 | `ai` | 어떤 AI로 만들 거예요? | 항상 | `claude` Claude · `chatgpt` ChatGPT · `gemini` Gemini · `none` 아직 없어요 |
| 5 | `os` | 어떤 컴퓨터로 만들어요? | 항상 | `windows` Windows · `mac` Mac |

- 비활성: `platform ∈ {apple, mac}`이면 `os=windows` 잠금 + 이유 "iPhone·iPad·Mac 앱은 Apple의 개발 도구 Xcode가 Mac에서만 돌아가서, Mac이 있어야 만들 수 있어요." `platform=windows`면 `os=mac` 잠금 + 이유 "Windows 앱은 Windows에서 실행해 보면서 만들어야 해서, Windows 컴퓨터가 있어야 해요."
- 데스크톱 앱 기술: Mac 앱 = SwiftUI(Xcode), Windows 앱 = C#/.NET(WPF 또는 WinUI, AI가 고름, Visual Studio). 각 플랫폼 공식 도구로 가는 쪽이 AI가 실수를 덜 하고, Electron 같은 공용 기술로 가면 `build-app-mac`·`build-app-windows`가 거의 같아진다.(내 결정)
- 옵션 설명 문구와 질문 부제는 시안 보드 1의 문구를 출발점으로 한다.
- AI 옵션 설명에는 들어가는 곳과 비용을 적는다. Claude "Claude 앱의 Code 탭 · Pro 요금제부터", ChatGPT "Codex 앱 · 무료 요금제로도 시작할 수 있어요", Gemini "Google Antigravity · 무료, 만 18세 이상"(§9), 아직 없어요 "무료로 시작할 수 있는 걸로 골라 드려요".
- 위저드 모양·동작(이전 버튼, 답한 칩, 단계 전환 시 질문 제목 포커스, 비활성 이유 표시)은 지금 `GuideWizard`의 동작을 유지하고, 겉모양은 하위 페이지 톤 설계 §5.7(가이드 = purple, `ChoiceRow`)을 따른다.
- 진행 표시는 "질문 N"(총 개수는 답에 따라 바뀌므로 쓰지 않음).
- `GUIDE_STEPS`·`visibleSteps`·`buildSlug`·`resolveSlug` 구조는 유지하고 내용만 바꾼다. 옵션 상수는 `src/lib/constants.ts`의 `GUIDE_*`를 새 값으로 교체한다.
- 홈 `GuideTeaser`는 `GUIDE_STEPS[0]`를 그대로 쓰므로 옵션 4개로 바뀐다. 가이드 쪽 아이콘 맵에 `tool`(Terminal)을 넣는다. 프로젝트 종류 상수(`PROJECT_TYPES`, 탐색·프로젝트·해줘가 쓰는 cli·library)와 공용 아이콘 맵은 건드리지 않는다. 가이드 전용 값은 가이드 전용 맵에만 둔다.
- `GUIDE_PROGRAM_TYPES`를 다른 곳이 쓰는지(하위 페이지 톤 계획 Task 9 Step 5가 해줘 위저드 설명 대체로 쓰게 돼 있음) 구현 시점에 grep해서, 쓰는 곳이 있으면 그쪽은 `PROJECT_TYPES` 기반으로 바꾼다. 소개 문구 "설치부터 첫 실행까지"는 "AI한테 일 시키는 법부터 인터넷에 올리는 법까지"로 바꾼다.

## 4. 결과 화면 (스테퍼)

사용자 반응: "오 너무 좋다". 시안 보드 2가 기준이다.

- 주소: `/guide/<보이는 질문의 답을 '/'로 연결>`. 예) `/guide/website/yes/claude/mac`, `/guide/app/android/chatgpt/windows`, `/guide/tool/gemini/mac`.
- 화면 구성(위에서 아래로)
  1. 고른 답 칩 + 오른쪽 "다시 고르기"(`/guide`)
  2. 제목: 종류별 고정 문구(예: "웹사이트 만들어서 올리기", "Android 앱 만들어서 친구에게 주기")
  3. **진행 막대**: 장 4칸(4열 grid). 지난 장은 꽉 참, 지금 장은 장 안 진행률만큼 참, 앞 장은 빔. 칸은 버튼이라 누르면 그 장 첫 단계로. 지금 장에 `aria-current="step"`. 모바일에서는 라벨을 숫자만 보이게 줄여도 된다.
  4. 장 이름 줄: "N장 · 장 이름 — 장 안 순번 / 장 단계 수" + 오른쪽 위키 링크 자리(§7)
  5. 새 장의 첫 단계에서만, 1장이 아니면 "○○ 끝! 이제 ○○ 차례예요." 한 줄 띠
  6. **단계 카드 하나**(한 화면에 한 단계). 카드 맨 위에 "장-순번"(예: `3-2`)을 코드가 자동으로 붙이고, 조각에 `[!route]`가 있으면 그 위에 경로 표시줄(§5.3). 둘 다 시안 보드 2에 있다
  7. 아래: "이전"(첫 단계에서 비활성) · 오른쪽 주 버튼(단계별 문구, §5의 `[!next]`, 없으면 "다음"). 장의 마지막 단계면 기본 문구 "N장으로". 마지막 단계에는 주 버튼 대신 "다른 걸 만들어 볼래요"(`/guide`)
  8. 맨 아래 작은 글씨: "이 가이드는 학생들이 같이 고쳐요. 틀렸거나 바뀐 데가 보이면 '고치기'를 눌러 주세요."(위키 기능이 붙은 뒤에만)
- 단계 전환 시 새 단계 제목으로 포커스를 옮기고, 카드 위치가 화면 위로 벗어나 있으면 카드 머리로 스크롤한다.
- **진행 저장**: `localStorage`에 경로별 마지막 단계 번호를 저장하고, 다시 들어오면 그 단계부터. 모든 접근은 try/catch, 실패해도 첫 단계부터 정상 표시.
- 4장 마지막 단계 카드 아래에는 고정 버튼 2개: "내 프로젝트 등록하기"(`/projects/new`, blue-600) · "해줘! 둘러보기"(`/haejwo`). 이 버튼은 조각 내용이 아니라 화면 코드에 둔다(위키로 편집되지 않게).
- 옛 주소(지금의 4~5세그먼트 슬러그)는 `resolveSlug`가 실패하면 404 대신 `/guide`로 `redirect`. 팁 글 등에 옛 링크가 남아 있을 수 있어서.(내 결정)
- 카드: 라이트 흰 바탕 + zinc-200 선, 다크 zinc-900 카드 + 본문 zinc-300(긴 글을 zinc-950 바탕에 바로 올리지 않는다는 사용자 피드백). 패딩 `p-6 sm:p-8`, 페이지 좌우 `px-6`.
- 전환 애니메이션은 짧은 페이드 정도만, `motion-reduce`면 없음.

## 5. 콘텐츠 구조 — 장 4개 = 조각

### 5.1 장과 조각 key

| 장 | 이름 | 무엇에 따라 달라지나 | 조각 key |
|---|---|---|---|
| 1 | AI를 에이전트로 쓰기 | `ai`(+ `os`는 조각 안 블록으로) | `agent-claude`, `agent-chatgpt`, `agent-gemini` |
| 2 | 만들고 돌려 보기 | `type`, 앱이면 `platform` | `build-website`, `build-extension`, `build-tool`, `build-app-android`, `build-app-apple`, `build-app-mac`, `build-app-windows` |
| 3 | 인터넷에 올리기 | `type`, `data`, `platform` | `ship-website`(data=no/unsure), `ship-website-data`(data=yes), `ship-extension`, `ship-app-android`, `ship-app-apple`, `ship-app-desktop`(mac·windows 공용), `ship-tool` |
| 4 | 이 사이트에 등록하기 | 없음 | `register` |

- 합계 18개. key는 6f 설계의 정규식 `^[a-z0-9][a-z0-9-]{0,99}$`을 따른다.
- `ai=none`은 §9에서 정한 추천 도구의 `agent-*` 조각으로 보낸다. 이때 1장 첫 카드 위에 "무료로 시작할 수 있는 ○○로 골랐어요" 한 줄을 화면 코드가 붙인다.
- `data=unsure`는 `ship-website`를 쓰고, 그 조각 마지막 단계에 "로그인이 필요해졌다면" 접힘 블록으로 `ship-website-data` 쪽 가이드 주소(`/guide/website/yes/<ai>/<os>`)를 안내한다.
- `build-website`의 "로그인은 3장에서 붙여요" 같은 답별 문구도 `[!only data=yes]` 블록으로 쓴다.
- `OS`별 차이는 파일을 나누지 않고 조각 안의 `[!only os=mac]`·`[!only os=windows]` 블록(§5.3)으로 처리한다. 화면은 고른 OS 블록만 보여 준다. 이유: 데스크톱 앱 경로에서는 OS 차이가 몇 줄뿐인데 파일을 나누면 지금 같은 복붙이 다시 생긴다.(내 결정)
- 앱 종류의 준비물(Android Studio, Xcode 설치 등)은 1장이 아니라 `build-app-*` 첫 단계에 둔다. 1장은 AI 도구만 다룬다.
- 장 이름과 조각 표시 이름(`title`, 예: "1장 · Claude로 에이전트 쓰기")은 코드의 레지스트리에 둔다. 파일에는 단계만 있다.

### 5.2 파일 형식

- 위치: `src/content/guides/<key>.md` (평평하게, 파일명 = key). 지금 파일 25개와 `README.md`는 지운다. 새 작성법은 `src/content/guides/README.md`에 다시 쓴다(가이드로 노출 안 됨).
- 단계 구분: 한 줄에 `---`만 있으면 단계가 나뉜다(지금과 같음).
- 각 단계는 `## 단계 제목`으로 시작한다. 6f 편집기는 body 첫 헤딩을 단계 이름으로 쓴다.
- `===` 다음 카드 섹션은 없앤다(4장 고정 버튼으로 대체).
- frontmatter 없음.
- 원본 마크다운 HTML은 렌더하지 않는다(`rehype-raw` 쓰지 않음). 학생이 편집하는 내용이라서.

### 5.3 단계 안 상자 표기

GitHub 알림 문법 모양의 인용문으로 쓴다. 새 라이브러리 없이 렌더러의 `blockquote`에서 첫 줄의 `[!종류]`를 읽어 처리한다.

| 표기 | 화면 | 시안 대응 |
|---|---|---|
| `> [!say]` + 본문 | "AI에게 이렇게 말해요" 상자 + 복사 버튼(본문 텍스트를 클립보드로, 성공 시 "복사했어요" 잠깐 표시) | 회색 상자 |
| `> [!ok]` + 본문 | "됐다는 신호" 상자 | emerald |
| `> [!warn]` + 본문 | "주의" 상자. `> [!warn] 안 하면`처럼 `]` 뒤 글자가 있으면 그게 라벨 | amber |
| `> [!more] 요약 문구` + 본문 | 접힘 블록(`<details>`), 요약 문구가 `<summary>` | "터미널이 편하면" |
| `> [!only os=mac]` + 본문 | 조건이 지금 고른 답과 맞을 때만 보임(상자 없이 본문 그대로). 조건은 질문 key=value, 여러 개면 공백으로 나열(모두 맞아야 함), 값 여러 개는 `,`(예: `[!only data=no,unsure]`). 모르는 key면 항상 보임 | — |
| `> [!route] GitHub` | 화면에 그리지 않음. 이 단계가 경로의 어느 칸인지 표시. 조각 안 `[!route]` 값들을 처음 나온 순서대로 모아 카드 위 경로 표시줄을 만들고 지금 칸을 강조(시안 3장). `[!route]`가 없는 조각은 표시줄 없음 | GitHub → Supabase → Vercel |
| `> [!next] 문구` | 화면에 그리지 않음. 그 단계의 주 버튼 문구로 쓴다 | "떴어요, 다음" |
| 링크 `[문구](guide:ai=chatgpt)` | 지금 고른 답에서 그 key만 바꾼 가이드 주소(`/guide/...`)로 바뀐다. 바꾼 조합이 막히면(§3 비활성) 링크 대신 글자만 | "ChatGPT(Codex)로 바꿔 고르기" |

- 상자 라벨 문구("○○에게 이렇게 말해요"의 ○○)는 고른 AI 이름(Claude/ChatGPT/Gemini)으로 채운다. 렌더러 prop으로 받는다.
- 조건(`[!only]`)과 바꾼 주소(`guide:`)는 렌더러가 `answers` prop을 받아 처리한다. `answers`가 없으면(6f 편집기 미리보기) `[!only]` 블록은 전부 보이되 "Mac일 때만"처럼 조건 라벨을 단 점선 상자로, `guide:` 링크는 글자만 그린다.
- 치환 문법(`{ai}` 같은 글자 바꿔 넣기)은 만들지 않는다. 조건 블록 + `guide:` 링크로 충분하고, 편집하는 학생이 배울 문법이 적다.(내 결정)
- 표기가 틀리면(모르는 `[!xxx]`) 그냥 인용문으로 그린다. 에러 없음.
- 색 대비는 CLAUDE.md 「색 대비」 규칙을 따른다(상자 글자 emerald-800·amber-800 이상, 다크 대응 포함).

### 5.4 쓰는 원칙 (모든 조각)

- 단계 하나 = 할 일 하나. 각 단계에 가능한 한 `[!ok]`(됐다는 신호)와 `[!next]`를 둔다.
- 명령어는 학생이 아니라 AI가 치게 한다. 학생 몫은 가입·로그인 승인·값 복사. 그래서 반복 작업에는 `[!say]` 문장을 준다.
- 1장은 반드시 "채팅과 에이전트의 차이"와 "들어간 게 맞는지 확인하는 신호"를 다룬다(Claude: Chat 탭이 아니라 Code 탭 → Local → Select folder).
- 3장은 추천 경로 하나만. 경로마다 "여기까지 하면 친구가 써 볼 수 있다"는 첫 목표를 먼저 둔다(시안 보드 3의 보라 칸).
- 설치 링크는 직접 링크(CLAUDE.md 「설치 링크 규칙」). macOS 터미널 설치 블록은 CLAUDE.md의 Claude Code 표준 블록을 `[!more] 터미널이 편하면` 안에 그대로 쓴다. `brew` 금지.
- 사실(요금제 조건, 메뉴 이름, 연령 제한, 비용)은 쓸 때 공식 문서로 확인한다. 확인 못 한 건 쓰지 않는다. 시안에 쓴 사실 중 확인된 것: Claude Code 탭 = Pro 이상(code.claude.com 데스크톱 문서), Codex 앱 = macOS·Windows 출시, Play 개인 계정 신규 앱 = 테스터 12명·14일, Chrome 웹 스토어 등록비 $5, Apple Developer Program 연 $99, Play 등록비 $25. 다시 확인하고 쓴다.
- Supabase 키 이름은 현재 콘솔 기준(Publishable key / Secret key, 예전 anon / service_role)으로 쓰고, Secret key를 코드·GitHub에 두지 말라는 `[!warn]`을 반드시 넣는다.
- `ship-website-data`에는 Supabase Authentication › URL Configuration의 Site URL을 배포 주소로 바꾸는 단계를 넣는다(가장 많이 놓치는 곳).
- 해요체, 쉬운 말, 이모지 없음, 마케팅 문구 없음(CLAUDE.md 「카피」).
- 예시 요청 문장은 투두리스트 대신 학교 생활에 붙은 것(급식, 시간표, 동아리 등)으로.

### 5.5 종류별 3장 추천 경로 (시안 보드 3)

| 조각 | 첫 목표 → 그다음 |
|---|---|
| `ship-website` | GitHub → **Vercel**(○○.vercel.app) |
| `ship-website-data` | GitHub → Supabase → **Vercel** → Supabase Site URL |
| `ship-extension` | **폴더째 친구에게**(개발자 모드로 로드) → Chrome 웹 스토어 |
| `ship-app-android` | **APK 파일 보내기** → Play Console(테스터 12명·14일 → 출시) |
| `ship-app-apple` | **내 폰에 설치**(무료, 7일마다 다시) → TestFlight → App Store |
| `ship-app-desktop` | **GitHub Releases에 설치 파일** → 서명 안 된 앱 경고 넘기는 법을 README에 |
| `ship-tool` | **GitHub 저장소 + README** → 원하면 npm / PyPI |

Cloudflare는 기본 경로에 넣지 않는다(경로 하나 원칙).(내 결정)

## 6. 코드 구조

| 파일 | 할 일 |
|---|---|
| `src/lib/constants.ts` | `GUIDE_*` 상수와 타입을 §3 값으로 교체. 안 쓰게 되는 상수(`GUIDE_TERMINAL`, `GUIDE_ANDROID_GEMINI_TOOL`) 삭제 |
| `src/lib/guide.ts` | `GUIDE_STEPS`를 §3으로. 추가: 장 레지스트리 `GUIDE_CHAPTERS`(번호·이름), `planGuide(answers) → { title, chapters: { no, name, key }[], recommendedAi?: string }`(§5.1 매핑), `allGuideCombos()`(가능한 모든 답 조합 열거, 역색인·정적 생성용) |
| `src/lib/guide-content.ts` (server) | `getFragment(key) → Promise<GuideFragment \| null>`(파일 읽어 `{ key, title, steps: { id: 's1'…, body }[], extra: null }`), `listUsages(key) → Promise<{ label, href }[]>`(`allGuideCombos`로 그 key를 쓰는 조합의 결과 주소와 칩 라벨), `loadGuide(answers)`(planGuide + 각 장 조각 읽기). 6f의 `getLatestDoc`이 main에 있으면 `loadGuide`는 그것을 쓰고, 없으면 `getFragment`를 쓴다 — 나중에 들어오는 쪽이 이 한 줄을 바꾼다 |
| `src/components/guide/guide-step-body.tsx` (client 가능) | `GuideStepBody({ body, answers?, aiLabel? })`: `Markdown` 위에 §5.3 상자·조건·링크 처리. `fs`·서버 전용 import 금지. 6f 편집기 미리보기·옛 버전 보기가 그대로 쓴다(6f와 약속한 이름·위치). `answers` 없을 때의 편집기용 표시는 §5.3. `[!next]`·`[!route]` 추출 함수(`parseStepMeta(body)`)는 같은 파일에서 export(뷰어·편집기 공용) |
| `src/components/guide/guide-viewer.tsx` (client) | §4 스테퍼로 다시 작성. 장 경계·진행 막대·단계별 다음 문구(`[!next]` 추출)·진행 저장 |
| `src/components/guide/guide-wizard.tsx` | §3 질문으로. 동작 유지 |
| `src/app/(nav)/guide/page.tsx`, `[...slug]/page.tsx` | 머리·바탕을 하위 페이지 톤으로. 옛 슬러그는 `/guide`로 redirect. `generateMetadata`로 결과 제목 |
| `src/components/home/guide-teaser.tsx` | §3 마지막 항목 |
| `src/content/guides/*.md` | 옛 25개 삭제, 새 18개 작성, `README.md` 새 형식으로 |
| `CLAUDE.md`, `AGENTS.md` | 「바이브 코딩 가이드」 절을 새 구조로 갱신 |

- `GuideFragment` 타입 모양은 6f의 `WikiDoc`과 같게 둔다(§7).
- 결과 페이지는 지금처럼 동적 렌더. 위키 기능이 붙으면 DB 최신 버전을 읽어야 하므로 정적 생성은 하지 않는다.

## 7. 위키 편집 기능(6f 세션)과 맞닿는 곳

6f 설계 §4·§7.5 기준. 합의된 분담: 이 작업은 위 §6 파일들, 6f는 `docs/18-supabase-guide-revisions.sql`, `src/lib/guide-wiki/*`, `src/components/guide-wiki/*`, `src/app/(nav)/guide-wiki/**`, 미들웨어 보호 라우트.

- 결과 화면 장 이름 줄 오른쪽에 조각별 "고치기"(`/guide-wiki/<key>/edit?from=<지금 가이드 경로>`) · "기록"(`/guide-wiki/<key>/history`) ghost 링크 자리. 카드 아래에 "마지막으로 ○○님이 고침 · 3일 전" 한 줄 자리(`getDocMeta(key)`).
- 6f 코드가 main에 없을 때는 이 자리를 렌더하지 않는다(빈 자리·죽은 링크 금지). 6f 코드가 있는지는 빌드 시점에 import로 정해지므로, 이 작업은 링크 자리를 `GuideChapterTools({ fragmentKey, from })` 같은 작은 컴포넌트로 분리해 두고 6f가 그 안을 채우게 한다.(내 결정)
- `GuideStepBody`를 6f의 `src/components/guide-wiki/step-body.tsx`가 감싸 쓴다.
- 6f에 줄 함수: `getFragment(key)`, `listUsages(key)`(§6).
- 가이드 구조가 바뀌어 조각 key가 사라지면 그 key의 DB 버전은 고아가 된다. key 이름을 바꾸지 않는 것을 원칙으로 한다.

## 8. 하위 페이지 톤 작업과 겹치는 곳

`docs/superpowers/plans/2026-10-24-subpage-tone.md` Task 9 Step 7이 `guide-wizard.tsx`와 가이드 페이지 머리를 바꾸게 돼 있다. 이 재작성이 그 파일들을 새로 쓰므로, 톤 작업은 가이드를 건너뛰고 이 작업이 톤 설계 §5.7을 직접 반영한다. 톤 작업의 공용 컴포넌트(`PageHero`, `ChoiceRow`)가 구현 시점에 main에 있으면 쓰고, 없으면 같은 모양을 가이드 파일 안에 만들고 나중에 교체한다.

## 9. 사용자 결정 (2026-10-24)

**Gemini와 "아직 없어요"** — "Gemini 남기고 경고"
- 배경: Antigravity는 만 18세 이상만 쓸 수 있다(Google AI 개발자 포럼 운영자 답변). Gemini CLI 무료 경로(Code Assist for individuals)도 Workspace 계정(학교 계정)과 동의 연령 미만은 쓸 수 없다. 고등학생 대부분은 Gemini 에이전트를 쓰지 못할 가능성이 크다. Codex 앱은 ChatGPT 무료 요금제로도 쓸 수 있으나 사용량 제한이 있고 무료 제공이 임시일 수 있다.
- 결정: Gemini 옵션은 남긴다. 옵션 설명에 "Google Antigravity · 무료, 만 18세 이상"을 적는다. `agent-gemini` 첫 단계 맨 위에 나이·계정 제한 `[!warn]`과 `[ChatGPT로 바꿔 고르기](guide:ai=chatgpt)` 링크를 둔다.
- `ai=none` → `agent-chatgpt`(Codex 앱). 1장 첫 카드 위 안내: "무료로 시작할 수 있는 ChatGPT(Codex)로 골랐어요".
- 구현 시점에 연령·요금 조건을 공식 문서로 다시 확인하고, 바뀌었으면 문구만 고친다.

**하위 페이지 톤 작업과의 분담** — "톤 계획서에서 가이드 빼기"
- `docs/superpowers/plans/2026-10-24-subpage-tone.md` Task 9 Step 7을 "가이드 재작성 쪽에서 처리"로 고쳤다(2026-10-24, 사용자 승인). 가이드 페이지 톤은 이 작업이 톤 설계 §5.7대로 직접 반영한다.

## 10. 빌더에게 맡기는 것

- 조각 18개의 실제 문구(시안 보드 2의 Claude·웹사이트 문구가 기준 톤).
- 결과 제목 문구, 위저드 옵션 아이콘 매핑, 진행 막대 모바일 표시 방식.
- 확인 방법: `npx tsc --noEmit`, `npm run lint`, 그리고 브라우저로 위저드 모든 분기(앱 4종·웹 3종·확장·도구 × AI 4 × OS 2 중 대표 조합)와 결과 스테퍼(진행 저장, 장 전환 띠, `[!next]`, OS 블록, 복사 버튼, 옛 슬러그 redirect)를 데스크탑·모바일·다크에서 확인. 이 저장소에는 테스트 러너가 없다.
