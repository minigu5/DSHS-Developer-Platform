# iPadOS 앱 만들기 — Claude Code (macOS)

iPadOS 앱은 iOS 앱과 같은 Swift + SwiftUI로 만들어요.
개발 방식도 거의 동일하지만, iPad의 큰 화면을 활용하는 레이아웃을 추가로 고려합니다.

---

# 1단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치 (용량이 커서 시간이 걸려요)
2. 설치 완료 후 Xcode 실행 → 추가 컴포넌트 설치 허용

```bash
# 커맨드 라인 도구도 설치
xcode-select --install
```

---

# 2단계: 새 iPad 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** 클릭
2. **iOS → App** 선택 → Next (iOS와 iPadOS는 같은 플랫폼 옵션을 공유해요)
3. 프로젝트 이름, **Interface: SwiftUI**, **Language: Swift** 선택 → Create

---

# 3단계: Claude Code 설치 및 실행

터미널에서 Claude Code를 설치하세요.

```bash
# Node.js가 없다면 먼저 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc
nvm install --lts && nvm use --lts

# Claude Code 설치
npm install -g @anthropic-ai/claude-code
```

프로젝트 폴더로 이동해 Claude Code를 실행하세요:

```bash
cd ~/Desktop/MyIPadApp
claude
```

iPad에 최적화된 앱을 요청하세요:

> "이 SwiftUI 앱을 iPad용으로 최적화해줘. 왼쪽에 사이드바 목록, 오른쪽에 상세 내용이 보이는 분할 화면 레이아웃으로 만들어줘."

---

# 4단계: iPad 시뮬레이터로 실행

Xcode 상단에서:

1. 기기 선택 드롭다운 → **iPad Pro 13-inch** 등 iPad 모델 선택
2. ▶ (Run) 버튼 클릭 → iPad 시뮬레이터에서 확인

***

**iPad 앱 개발 팁:**
- `NavigationSplitView` — iPad의 분할 화면에 최적화된 SwiftUI 컴포넌트
- `adaptiveLayout` — 화면 크기에 따라 레이아웃이 자동으로 바뀌게 하는 방법
- Claude에게 "iPad와 iPhone 양쪽에서 잘 보이게 해줘" 라고 요청하면 반응형으로 만들어줘요

---

# 5단계: 기능 추가하며 완성하기

> "Apple Pencil로 메모할 수 있는 기능도 추가해줘"  
> "멀티태스킹 모드(슬라이드 오버)도 지원되게 해줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/tutorials/swiftui) — SwiftUI 공식 튜토리얼로 더 배우고 싶다면.
