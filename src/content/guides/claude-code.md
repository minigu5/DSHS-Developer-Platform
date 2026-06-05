# Claude Code로 바이브 코딩 시작하기 (macOS / Linux)

Claude Code는 Anthropic이 만든 터미널 기반 AI 코딩 에이전트예요.
만들고 싶은 걸 한국어로 설명하면 Claude가 직접 파일을 만들고 코드를 작성해줍니다.

---

# 1단계: Node.js 설치

Claude Code는 Node.js 위에서 동작해요. 먼저 버전 관리 도구인 nvm으로 설치합니다.

**macOS:**
```bash
# nvm 설치 (Node.js 버전 관리 도구)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc

# Node.js 최신 LTS 설치
nvm install --lts && nvm use --lts
```

**Linux (Ubuntu / Debian):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts && nvm use --lts
```

설치 확인:
```bash
node -v   # v22.x.x 형태로 나오면 성공
```

---

# 2단계: Claude Code 설치

```bash
npm install -g @anthropic-ai/claude-code
```

설치 확인:
```bash
claude --version
```

---

# 3단계: 로그인

터미널에서 `claude` 를 실행하고 안내에 따라 로그인하세요.

```bash
claude
```

처음 실행하면 브라우저가 열리며 Anthropic 계정으로 로그인하라고 안내해요.
Claude.ai Pro / Max 구독이 있으면 그 계정으로 로그인하면 됩니다.

> API 키를 직접 사용하고 싶다면 [console.anthropic.com](https://console.anthropic.com) 에서 키를 발급받은 뒤
> `ANTHROPIC_API_KEY` 환경 변수에 설정하면 돼요.

---

# 4단계: 첫 프로젝트 시작

프로젝트 폴더를 만들고 그 안에서 `claude` 를 실행하세요.

```bash
mkdir my-project && cd my-project
claude
```

Claude Code가 실행되면 만들고 싶은 것을 한국어로 설명하세요:

> "오늘 할 일을 입력하고 체크할 수 있는 투두리스트 웹페이지를 만들어줘. 귀엽게 디자인해줘."

Claude가 파일을 만들고 코드를 작성합니다. 완성되면 열어서 확인해보세요!

---

# 5단계: 바이브 코딩 핵심 요령

> 작은 기능 하나씩 요청하고, 실행해서 확인하고, 다음 기능을 요청하세요.

- **에러가 나면** → 에러 메시지를 Claude에게 그대로 붙여넣기
- **수정하고 싶으면** → "배경색을 하늘색으로 바꿔줘"처럼 구체적으로 말하기
- **막히면** → "지금까지 만든 걸 설명해줘"로 현재 상태 파악
- **종료할 때** → `/exit` 입력

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 완성한 프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Claude Code 공식 문서](https://docs.anthropic.com/ko/docs/claude-code/overview) — 더 깊은 기능이 궁금하다면.
