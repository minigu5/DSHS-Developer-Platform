# iOS 앱 만들기 — ChatGPT Codex (macOS)

iOS 앱은 Swift + SwiftUI로 만들어요. macOS에서만 개발할 수 있습니다.
ChatGPT Codex가 Swift 코드를 작성하고, Xcode 시뮬레이터로 확인합니다.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 **macOS용** 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인 (무료 플랜도 사용 가능)

---

# 2단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치 (용량이 커서 시간이 걸려요)
2. 설치 완료 후 Xcode를 실행해 추가 컴포넌트 설치 허용

```bash
# 터미널에서 커맨드 라인 도구도 설치
xcode-select --install
```

---

# 3단계: 새 iOS 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** → **iOS → App** → Next
2. 프로젝트 이름 입력, **Interface: SwiftUI**, **Language: Swift** → Create

---

# 4단계: ChatGPT Codex로 코드 작성

Codex 앱에서:

1. **New Task** → Xcode 프로젝트 폴더 선택
2. 채팅창에 이렇게 요청하세요:

> "이 SwiftUI iOS 앱에 할 일 목록 기능을 추가해줘. 체크박스로 완료 처리되고, 스와이프로 삭제할 수 있게 만들어줘."

Codex가 Swift 파일을 수정하면 **Accept** 버튼으로 적용하세요.

---

# 5단계: 시뮬레이터로 실행

Xcode에서:

1. 상단 기기 드롭다운 → iPhone 모델 선택 (예: iPhone 16)
2. ▶ (Run) 버튼 클릭 → 시뮬레이터에서 앱 실행

에러가 나면 Xcode 오류 메시지를 Codex 채팅에 붙여넣으세요.

> **실기기에서 실행하려면:** Xcode → Settings → Accounts 에서 Apple ID 등록 후, iPhone을 USB로 연결하면 돼요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/tutorials/swiftui) — SwiftUI 공식 튜토리얼로 더 배우고 싶다면.
