# 브라우저 확장프로그램 만들기 — Google Antigravity

브라우저 확장프로그램은 Chrome, Edge 등의 브라우저에 기능을 추가하는 작은 프로그램이에요.
HTML, CSS, JavaScript로 만들 수 있고, Google Antigravity의 Gemini가 코드를 대신 작성해줍니다.

---

# 1단계: Google Antigravity 설치

아직 설치하지 않았다면:

1. [antigravity.google/download](https://antigravity.google/download) 에서 내 OS에 맞는 버전 다운로드
2. 설치 후 실행 → Google 계정으로 로그인

---

# 2단계: 확장프로그램 프로젝트 시작

Antigravity에서:

1. **New Project** 클릭 → 프로젝트 폴더 위치 선택 (예: 바탕화면에 `my-extension` 폴더)
2. Gemini 채팅창에 이렇게 요청하세요:

> "Chrome 확장프로그램을 만들어줘. 현재 페이지의 배경색을 버튼 클릭으로 랜덤하게 바꿔주는 기능이야. Manifest V3 형식으로 만들어줘."

Gemini가 프로젝트에 필요한 파일들을 자동으로 생성합니다:
- `manifest.json` — 확장프로그램 설정
- `popup.html` — 팝업 화면
- `popup.js` — 동작 코드

변경 사항은 **Accept** 버튼으로 적용하세요.

---

# 3단계: Chrome에 확장프로그램 로드

1. Chrome 주소창에 `chrome://extensions` 입력
2. 우측 상단 **개발자 모드** 켜기
3. **압축 해제된 확장 프로그램 로드** 클릭
4. Antigravity에서 만든 프로젝트 폴더 선택

Chrome 툴바에 확장프로그램 아이콘이 나타납니다!

---

# 4단계: 기능 추가 및 수정

Antigravity의 Gemini 채팅창에 이어서 요청하세요:

> "팝업 디자인을 더 예쁘게 만들어줘, 카드 스타일로"  
> "단축키(Alt+B)로도 배경색을 바꿀 수 있게 추가해줘"

코드가 변경될 때마다:
1. Antigravity에서 **Accept** 클릭
2. Chrome 확장 관리 페이지에서 새로고침(🔄) 버튼 클릭

***

**Antigravity 바이브 코딩 팁:**
- `Ctrl+K` (또는 `Cmd+K`) 로 에디터 안에서 바로 코드 수정 요청 가능
- 에러 메시지가 뜨면 Gemini 채팅에 붙여넣으면 자동으로 수정해줘요

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 확장프로그램을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Chrome 확장 API 문서](https://developer.chrome.com/docs/extensions) — 더 다양한 기능을 알고 싶다면.
