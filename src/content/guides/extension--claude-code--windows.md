# 브라우저 확장프로그램 만들기 — Claude Code (Windows)

브라우저 확장프로그램은 Chrome, Edge 등의 브라우저에 기능을 추가하는 작은 프로그램이에요.
HTML, CSS, JavaScript로 만들 수 있고, Claude Code가 대부분의 코드를 대신 작성해줍니다.

---

# 1단계: 개발 환경 준비

아직 Claude Code를 설치하지 않았다면 먼저 설치해주세요.

**Node.js 설치:**
1. [nodejs.org](https://nodejs.org) 에서 **LTS 버전** 다운로드 및 설치
2. PowerShell(Windows Terminal)을 새로 열고 확인:

```powershell
node -v   # v22.x.x 형태로 나오면 성공
```

**Claude Code 설치:**
```powershell
npm install -g @anthropic-ai/claude-code
```

> 오류가 나면: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` 실행 후 재시도

그 다음 `claude` 를 실행해 로그인을 완료하세요.

---

# 2단계: 확장프로그램 프로젝트 시작

PowerShell에서 프로젝트 폴더를 만들고 Claude Code를 실행합니다.

```powershell
mkdir my-extension
cd my-extension
claude
```

Claude Code 채팅창에 이렇게 요청하세요:

> "Chrome 확장프로그램을 만들어줘. 현재 페이지의 배경색을 버튼 클릭으로 랜덤하게 바꿔주는 기능이야. Manifest V3 형식으로 만들어줘."

Claude가 다음 파일들을 생성해줄 거예요:
- `manifest.json` — 확장프로그램 설정 파일
- `popup.html` — 팝업 화면
- `popup.js` — 동작 코드
- 아이콘 파일들

---

# 3단계: Chrome에 확장프로그램 로드

1. Chrome 브라우저에서 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축 해제된 확장 프로그램 로드** 클릭
4. 아까 만든 `my-extension` 폴더 선택

이제 Chrome 툴바에 확장프로그램 아이콘이 나타납니다!

---

# 4단계: 기능 추가 및 수정

Claude Code 채팅창에 이어서 기능을 추가 요청하세요:

> "팝업에 색상 선택기도 추가해줘"  
> "확장프로그램 아이콘을 더 예쁘게 만들어줘"

코드가 바뀔 때마다 Chrome 확장 관리 페이지에서 새로고침 버튼(🔄)을 눌러 반영하세요.

---

# 5단계: Chrome 웹 스토어 출시 (선택)

완성된 확장프로그램을 세상에 공개하고 싶다면:

1. [Chrome 웹 스토어 개발자 대시보드](https://chrome.google.com/webstore/devconsole) 에서 개발자 등록 (1회 $5)
2. 확장프로그램 폴더를 ZIP 파일로 압축 후 업로드
3. 설명, 스크린샷 등을 입력하면 심사 후 출시

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 확장프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Chrome 확장 API 문서](https://developer.chrome.com/docs/extensions) — 더 다양한 기능을 알고 싶다면.
