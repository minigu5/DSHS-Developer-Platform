# 브라우저 확장프로그램 만들기 — ChatGPT Codex

브라우저 확장프로그램은 Chrome, Edge 등의 브라우저에 기능을 추가하는 작은 프로그램이에요.
ChatGPT Codex가 프로젝트 폴더에 직접 파일을 만들어줘서, 복잡한 설정 없이 바로 시작할 수 있어요.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

아직 설치하지 않았다면:

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 내 OS에 맞는 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인

무료 플랜으로도 사용할 수 있어요.

---

# 2단계: 확장프로그램 프로젝트 시작

Codex 앱에서:

1. **New Task** 클릭 → 프로젝트로 쓸 빈 폴더 선택 (예: 바탕화면에 `my-extension` 폴더 생성)
2. 채팅창에 이렇게 요청하세요:

> "Chrome 확장프로그램을 만들어줘. 현재 페이지의 배경색을 버튼 클릭으로 랜덤하게 바꿔주는 기능이야. Manifest V3 형식으로 만들어줘."

Codex가 프로젝트 폴더에 파일들을 자동으로 생성합니다:
- `manifest.json` — 확장프로그램 설정
- `popup.html` — 팝업 화면
- `popup.js` — 동작 코드

**Accept** 버튼으로 변경 사항을 적용하세요.

---

# 3단계: Chrome에 확장프로그램 로드

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축 해제된 확장 프로그램 로드** 클릭
4. Codex가 만든 `my-extension` 폴더 선택

Chrome 툴바에 확장프로그램 아이콘이 나타납니다!

---

# 4단계: 기능 추가 및 수정

Codex 채팅창에 이어서 요청하세요:

> "팝업 디자인을 더 예쁘게 만들어줘"  
> "단축키(Alt+B)로도 배경색을 바꿀 수 있게 추가해줘"

코드가 바뀔 때마다:
1. Codex에서 **Accept** 클릭
2. Chrome 확장 관리 페이지에서 새로고침(🔄) 버튼 클릭

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 확장프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Chrome 확장 API 문서](https://developer.chrome.com/docs/extensions) — 더 다양한 기능을 알고 싶다면.
