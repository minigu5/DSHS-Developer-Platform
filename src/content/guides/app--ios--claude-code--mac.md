# iOS 앱 만들기 — Claude Code (macOS)

iOS 앱은 Swift 언어와 Xcode로 만들어요. macOS에서만 개발할 수 있습니다.
Claude Code가 Swift 코드 작성을 도와주고, Xcode 시뮬레이터로 확인합니다.

---

# 1단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치 (용량이 커서 시간이 걸려요)
2. 설치 완료 후 Xcode 실행 → 추가 컴포넌트 설치 허용

```bash
# 커맨드 라인 도구도 설치 (터미널에서)
xcode-select --install
```

---

# 2단계: 새 iOS 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** 클릭
2. **iOS → App** 선택 → Next
3. 프로젝트 이름 입력, **Interface: SwiftUI**, **Language: Swift** 선택 → Next
4. 저장 위치 선택 → Create

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

Xcode 프로젝트 폴더로 이동해 Claude Code를 실행하세요:

```bash
cd ~/Desktop/MyApp   # 프로젝트 폴더 경로
claude
```

이렇게 요청해보세요:

> "이 SwiftUI iOS 앱에 할 일 목록 기능을 추가해줘. 목록 화면과 항목 추가 버튼을 만들고, 체크박스로 완료 처리가 되게 해줘."

---

# 4단계: 시뮬레이터로 실행

Xcode 상단에서:

1. 상단 기기 선택 드롭다운 → 원하는 iPhone 모델 선택 (예: iPhone 16)
2. ▶ (Run) 버튼 클릭 → 시뮬레이터에서 앱 실행

Claude가 수정한 파일이 저장되면 Xcode에서 다시 ▶ 버튼으로 빌드해 확인하세요.

> **실기기에서 실행하려면:** Apple ID를 Xcode에 등록하고 (Xcode → Settings → Accounts) iPhone을 USB로 연결하면 돼요.

---

# 5단계: 기능 추가하며 완성하기

시뮬레이터를 띄워놓고 Claude Code에 계속 기능을 요청하세요:

> "완료된 항목은 회색으로 표시해줘"  
> "항목을 왼쪽으로 스와이프하면 삭제되게 해줘"  
> "앱 아이콘과 색상 테마를 바꿔줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/tutorials/swiftui) — SwiftUI 공식 튜토리얼로 더 배우고 싶다면.
