# ChatGPT Codex로 바이브 코딩 시작하기

ChatGPT Codex는 OpenAI가 만든 AI 코딩 에이전트 앱이에요.
Claude Code처럼 프로젝트 폴더를 열고 만들고 싶은 걸 설명하면, Codex가 직접 파일을 만들고 코드를 작성해줍니다.
**ChatGPT 무료 플랜**으로도 사용할 수 있어요!

---

# 1단계: ChatGPT Codex 앱 설치

[chatgpt.com/codex](https://chatgpt.com/codex) 에 접속해 내 OS에 맞는 앱을 다운로드하세요.

- **macOS:** Apple Silicon / Intel 중 내 Mac에 맞는 버전 선택
- **Windows:** Windows 버전 다운로드 (2026년 3월부터 지원)

설치 파일을 실행해 설치를 완료하세요.

> **터미널이 익숙하다면 CLI로도 설치 가능해요:**
> ```bash
> # macOS / Linux
> curl -fsSL https://chatgpt.com/codex/install.sh | sh
> ```
> ```powershell
> # Windows (PowerShell)
> powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"
> ```

---

# 2단계: ChatGPT 계정으로 로그인

Codex 앱을 실행하면 로그인 화면이 나와요.

1. **Sign in with ChatGPT** 클릭
2. ChatGPT 계정으로 로그인 (계정이 없다면 [chatgpt.com](https://chatgpt.com) 에서 무료 가입)
3. 로그인 완료 후 메인 화면 진입

---

# 3단계: 프로젝트 폴더 선택

Codex 앱에서:

1. **New Task** 또는 **Open Project** 클릭
2. 작업할 폴더 선택 (없다면 바탕화면에 `my-project` 폴더를 새로 만드세요)
3. Codex가 폴더에 접근할 권한을 허용

---

# 4단계: 첫 프로젝트 시작

채팅창에 만들고 싶은 것을 한국어로 설명하세요:

> "오늘 할 일을 입력하고 체크할 수 있는 투두리스트 웹페이지를 만들어줘. 귀엽게 디자인해줘."

Codex가 **Agent 모드**로 동작해 파일을 생성하고 코드를 작성합니다.
변경 사항을 확인하고 **Accept** 버튼으로 적용하세요.

완성된 `index.html` 파일을 더블클릭하면 브라우저에서 바로 열 수 있어요!

---

# 5단계: 바이브 코딩 핵심 요령

> 작은 기능 하나씩 요청하고, 실행해서 확인하고, 다음 기능을 요청하세요.

- **에러가 나면** → 에러 메시지를 Codex 채팅에 그대로 붙여넣기
- **수정하고 싶으면** → "배경색을 하늘색으로 바꿔줘"처럼 구체적으로 말하기
- **막히면** → "지금까지 만든 걸 설명해줘"로 현재 상태 파악

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 완성한 프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [ChatGPT Codex 공식 문서](https://chatgpt.com/codex/get-started/) — 더 깊은 기능이 궁금하다면.
