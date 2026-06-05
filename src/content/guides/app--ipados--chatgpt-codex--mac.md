# iPadOS 앱 만들기 — ChatGPT Codex (macOS)

iPadOS 앱은 iOS와 같은 Swift + SwiftUI로 만들어요. macOS에서만 개발할 수 있습니다.
ChatGPT Codex가 코드를 작성하고, iPad 시뮬레이터로 확인합니다.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 **macOS용** 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인 (무료 플랜도 사용 가능)

---

# 2단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치 (용량이 커서 시간이 걸려요)
2. 설치 완료 후 Xcode를 실행해 추가 컴포넌트 설치 허용

```bash
xcode-select --install
```

---

# 3단계: 새 iPad 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** → **iOS → App** 선택 (iOS와 iPadOS는 같은 플랫폼을 공유해요) → Next
2. 프로젝트 이름 입력, **Interface: SwiftUI**, **Language: Swift** → Create

---

# 4단계: ChatGPT Codex로 코드 작성

Codex 앱에서:

1. **New Task** → Xcode 프로젝트 폴더 선택
2. iPad에 최적화된 레이아웃을 요청하세요:

> "이 SwiftUI 앱을 iPad용으로 만들어줘. 왼쪽에 사이드바 목록, 오른쪽에 상세 내용이 보이는 분할 화면 레이아웃으로 구성해줘."

Codex가 파일을 수정하면 **Accept** 버튼으로 적용하세요.

---

# 5단계: iPad 시뮬레이터로 실행

Xcode에서:

1. 기기 드롭다운 → **iPad Pro 13-inch** 등 iPad 모델 선택
2. ▶ (Run) 버튼 클릭 → iPad 시뮬레이터에서 확인

에러가 나면 Xcode 오류 메시지를 Codex 채팅에 붙여넣으세요.

***

**iPad 앱 개발 팁 (Codex에게 요청해보세요):**
- "iPad와 iPhone 양쪽에서 잘 보이게 반응형으로 만들어줘"
- "Apple Pencil로 그림 그릴 수 있는 기능 추가해줘"
- "멀티태스킹(슬라이드 오버) 모드도 지원되게 해줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/tutorials/swiftui) — SwiftUI 공식 튜토리얼로 더 배우고 싶다면.
