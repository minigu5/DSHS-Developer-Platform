# Claude Code (macOS) 로 시작하기

macOS 에서 Claude Code 를 사용해 바이브 코딩을 시작하는 예시 가이드예요.
(이 파일은 작성 형식을 보여주기 위한 예시입니다 — 자유롭게 수정하세요.)

---

# 1단계: 개발 환경 준비

먼저 터미널과 코드 에디터를 준비합니다.

- **VS Code** 설치: <https://code.visualstudio.com>
- macOS 에는 터미널이 기본 내장되어 있어요 (`Spotlight` → "터미널" 검색)

---

# 2단계: Node.js 와 Claude Code 설치

터미널에 아래 명령을 차례로 입력하세요.

```bash
# Node.js 설치 여부 확인
node -v

# Claude Code 설치
npm install -g @anthropic-ai/claude-code
```

---

# 3단계: 첫 프로젝트 시작

프로젝트 폴더를 만들고 그 안에서 `claude` 를 실행합니다.

```bash
mkdir my-first-app && cd my-first-app
claude
```

이제 만들고 싶은 것을 한국어로 그대로 설명하면 Claude 가 코드를 작성해줘요.

---

# 4단계: 반복하며 완성하기

> 작은 기능 하나씩 요청하고, 실행해 확인하고, 다음 기능을 요청하세요.

막히는 부분이 있으면 에러 메시지를 그대로 붙여넣어 물어보면 됩니다. 끝!

===

# 다음으로 해볼 것

- [팁 둘러보기](/tips) — 다른 친구들이 정리한 개발 팁과 노하우를 구경해보세요.
- [내 프로젝트 등록하기](/projects/new) — 완성한 프로그램을 친구들에게 공유해보세요.
- [Claude Code 공식 문서](https://docs.claude.com/en/docs/claude-code) — 더 깊이 있는 사용법이 궁금하다면.
