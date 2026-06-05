# Claude Code로 바이브 코딩 시작하기 (Windows)

Claude Code는 Anthropic이 만든 터미널 기반 AI 코딩 에이전트예요.
만들고 싶은 걸 한국어로 설명하면 Claude가 직접 파일을 만들고 코드를 작성해줍니다.

---

# 1단계: Windows Terminal 설치

명령어 입력을 위해 Windows Terminal을 먼저 설치해요. (이미 있다면 건너뛰어도 돼요.)

1. [Microsoft Store](https://aka.ms/terminal)에서 **Windows Terminal** 설치
2. 이후 모든 명령어는 **Windows Terminal (PowerShell)** 에서 실행하세요.

---

# 2단계: Node.js 설치

Claude Code는 Node.js 위에서 동작해요. 공식 사이트에서 설치합니다.

1. [nodejs.org](https://nodejs.org) 접속 → **LTS 버전** 다운로드 및 설치
2. 설치 완료 후 PowerShell을 **새로 열고** 확인:

```powershell
node -v   # v22.x.x 형태로 나오면 성공
npm -v
```

> 버전이 표시되지 않으면 컴퓨터를 재시작한 뒤 다시 확인해보세요.

---

# 3단계: Claude Code 설치

```powershell
npm install -g @anthropic-ai/claude-code
```

설치 확인:
```powershell
claude --version
```

> **오류가 난다면:** PowerShell 실행 정책 문제일 수 있어요. 아래 명령을 실행한 뒤 다시 시도하세요.
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

# 4단계: 로그인

PowerShell에서 `claude` 를 실행하고 안내에 따라 로그인하세요.

```powershell
claude
```

처음 실행하면 브라우저가 열리며 Anthropic 계정으로 로그인하라고 안내해요.
Claude.ai Pro / Max 구독이 있으면 그 계정으로 로그인하면 됩니다.

> API 키를 직접 사용하고 싶다면 [console.anthropic.com](https://console.anthropic.com) 에서 키를 발급받은 뒤
> 시스템 환경 변수 `ANTHROPIC_API_KEY` 에 설정하면 돼요.

---

# 5단계: 첫 프로젝트 시작

프로젝트 폴더를 만들고 그 안에서 `claude` 를 실행하세요.

```powershell
mkdir my-project
cd my-project
claude
```

Claude Code가 실행되면 만들고 싶은 것을 한국어로 설명하세요:

> "오늘 할 일을 입력하고 체크할 수 있는 투두리스트 웹페이지를 만들어줘. 귀엽게 디자인해줘."

Claude가 파일을 만들고 코드를 작성합니다. 완성되면 파일 탐색기에서 열어 확인해보세요!

***

**바이브 코딩 핵심 요령:**
- **에러가 나면** → 에러 메시지를 Claude에게 그대로 붙여넣기
- **수정하고 싶으면** → "배경색을 하늘색으로 바꿔줘"처럼 구체적으로 말하기
- **막히면** → "지금까지 만든 걸 설명해줘"로 현재 상태 파악
- **종료할 때** → `/exit` 입력

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 완성한 프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Claude Code 공식 문서](https://docs.anthropic.com/ko/docs/claude-code/overview) — 더 깊은 기능이 궁금하다면.
