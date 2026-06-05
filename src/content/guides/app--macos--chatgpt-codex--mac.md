# macOS 데스크탑 앱 만들기 — ChatGPT Codex

macOS 전용 데스크탑 앱은 Swift + SwiftUI(또는 AppKit)로 만들어요.
ChatGPT Codex가 코드를 작성하고, Xcode로 바로 Mac에서 실행합니다.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 **macOS용** 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인 (무료 플랜도 사용 가능)

---

# 2단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치
2. 설치 완료 후 실행해 추가 컴포넌트 설치 허용

```bash
xcode-select --install
```

---

# 3단계: 새 macOS 앱 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** → **macOS → App** → Next
2. 프로젝트 이름 입력, **Interface: SwiftUI**, **Language: Swift** → Create

---

# 4단계: ChatGPT Codex로 코드 작성

Codex 앱에서:

1. **New Task** → Xcode 프로젝트 폴더 선택
2. 채팅창에 이렇게 요청하세요:

> "이 SwiftUI macOS 앱에 메모장 기능을 만들어줘. 왼쪽에 메모 목록, 오른쪽에 편집 영역이 있는 2단 레이아웃으로 만들고, 메모는 로컬에 저장되게 해줘."

Codex가 파일을 수정하면 **Accept** 버튼으로 적용하세요.

---

# 5단계: 빌드 및 실행

Xcode에서 ▶ (Run) 버튼 클릭 → Mac에서 바로 앱이 실행돼요!

Mac 앱은 시뮬레이터 없이 직접 실행되므로 결과를 바로 확인할 수 있어요.

에러가 나면 Xcode 오류 메시지를 Codex 채팅에 붙여넣으세요.

***

**macOS 앱 특화 기능 (Codex에게 요청해보세요):**
- "메뉴바 아이콘(NSStatusItem)을 추가해줘" — 상단 메뉴바에 앱 아이콘 추가
- "`Cmd+N` 단축키로 새 메모가 생성되게 해줘"
- "파일을 드래그 앤 드롭으로 열 수 있게 해줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/macos/) — macOS 앱 개발 공식 가이드.
