# 바이브 코딩 가이드 작성법

이 폴더의 `.md` 파일이 `/guide` 결과 화면에 나오는 내용이에요. **이 `README.md`는 가이드로 나오지 않아요.**

## 1. 구조: 장 4개 = 조각 4개

학생이 위저드에서 답하면, 결과 화면은 장 4개를 한 단계씩 넘기며 보여 줘요. 장마다 조각 파일 하나를 읽어요.

| 장 | 이름 | 조각 파일 |
|---|---|---|
| 1 | AI를 에이전트로 쓰기 | `agent-claude.md`, `agent-chatgpt.md`, `agent-gemini.md` |
| 2 | 만들고 돌려 보기 | `build-website.md`, `build-extension.md`, `build-tool.md`, `build-app-android.md`, `build-app-apple.md`, `build-app-mac.md`, `build-app-windows.md` |
| 3 | 인터넷에 올리기 | `ship-website.md`, `ship-website-data.md`, `ship-extension.md`, `ship-app-android.md`, `ship-app-apple.md`, `ship-app-desktop.md`, `ship-tool.md` |
| 4 | 이 사이트에 등록하기 | `register.md` |

어떤 답 조합이 어떤 조각을 쓰는지는 `src/lib/guide.ts`의 `planGuide()`가 정해요. 조각 하나를 여러 조합이 함께 써요. 그래서 한 파일을 고치면 그 조각을 쓰는 가이드 전부에 반영돼요. Windows·Mac 차이처럼 조합마다 조금 다른 부분은 파일을 나누지 말고 `[!only]` 블록으로 쓰세요.

새 조각을 추가하거나 파일 이름(= key)을 바꾸면 `planGuide()`와 `FRAGMENT_TITLES`도 같이 고쳐야 해요. 학생들이 위키로 고친 기록이 key에 묶여 있으니, key 이름은 되도록 바꾸지 마세요.

## 2. 파일 형식

```markdown
## 첫 단계 제목

할 일을 짧게 설명해요.

> [!ok]
> 이게 보이면 성공이에요.

> [!next] 됐어요, 다음

---

## 두 번째 단계 제목

...
```

- 한 줄에 `---`만 있으면 단계가 나뉘어요.
- 모든 단계는 `## 제목`으로 시작해요. 파일 맨 위의 `#` 제목이나 frontmatter는 쓰지 않아요.
- HTML 태그는 화면에 그려지지 않아요.

## 3. 상자 표기

인용문(`>`) 첫 줄에 `[!종류]`를 쓰면 상자가 돼요. 상자끼리는 빈 줄로 띄워요.

| 표기 | 화면 |
|---|---|
| `> [!say]` + `> 문장` | "○○에게 이렇게 말해요" 상자 + 복사 버튼. ○○는 고른 AI 이름으로 자동으로 채워져요 |
| `> [!ok]` 또는 `> [!ok] 라벨` | 됐다는 신호 (초록) |
| `> [!warn]` 또는 `> [!warn] 안 하면` | 주의 (노랑) |
| `> [!more] 터미널이 편하면` | 접힘 블록. 뒤 글자가 접힌 줄의 제목 |
| `> [!only os=mac]` | 조건이 맞을 때만 보임. 아래 참고 |
| `> [!next] 떴어요, 다음` | 그리지 않음. 이 단계의 다음 버튼 문구 |
| `> [!route] GitHub` | 그리지 않음. 3장 경로 표시줄에서 이 단계가 속한 칸 |

상자 안에 다른 상자를 넣으려면 `> > [!only os=mac]`처럼 `>`를 하나 더 붙여요.

### 조건 `[!only ...]`

`key=값` 형식이에요. 여러 개를 쓰면 모두 맞아야 하고, 값을 `,`로 이으면 그중 하나만 맞아도 돼요.

| key | 값 |
|---|---|
| `type` | `website`, `app`, `extension`, `tool` |
| `platform` (앱일 때) | `android`, `apple`, `mac`, `windows` |
| `data` (웹사이트일 때) | `yes`, `no`, `unsure` |
| `ai` | `claude`, `chatgpt`, `gemini`, `none` |
| `os` | `windows`, `mac` |

예) `> [!only os=windows]`, `> [!only data=no,unsure]`, `> [!only type=app os=mac]`

### 다른 가이드로 가는 링크

`[ChatGPT로 바꿔 고르기](guide:ai=chatgpt)`처럼 쓰면, 지금 고른 답에서 그 항목 하나만 바꾼 가이드 주소로 바뀌어요. 바꾼 조합이 막혀 있으면(예: iPhone 앱인데 Windows로 바꾸기) 링크 없이 글자만 보여요.

## 4. 쓰는 원칙

- 단계 하나에 할 일 하나. 되도록 모든 단계에 `[!ok]`와 `[!next]`를 둬요.
- 명령어는 학생이 아니라 AI가 치게 해요. 반복 작업에는 `[!say]` 문장을 줘요.
- 선택지를 늘어놓지 말고 추천 경로 하나만 정해 줘요.
- 설치는 직접 링크로 안내해요("앱스토어에서 검색" 금지). macOS의 Claude Code 터미널 설치는 `CLAUDE.md`의 표준 블록만 쓰고 `brew`는 쓰지 않아요.
- 요금, 나이 제한, 메뉴 이름은 공식 문서로 확인한 것만 써요.
- 해요체로, 이모지 없이 써요. 예시는 급식·시간표·동아리처럼 학교 생활에서 가져와요.
- 다른 장과 겹치는 내용은 쓰지 않아요. 1장은 AI 도구에 들어가는 것까지, 2장은 만들고 돌려 보는 것까지, 3장은 올리는 것만, 4장은 등록만 다뤄요.
