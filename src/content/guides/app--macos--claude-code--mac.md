# macOS 데스크탑 앱 만들기 — Claude Code

macOS 전용 데스크탑 앱은 Swift + SwiftUI(또는 AppKit)로 만들어요.
Claude Code가 Swift 코드를 작성하고, Xcode로 빌드합니다.

---

# 1단계: Xcode 설치

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치
2. 설치 완료 후 실행해 추가 컴포넌트 설치 허용

```bash
xcode-select --install
```

---

# 2단계: 새 macOS 앱 프로젝트 생성

Xcode 실행 후:

1. **Create New Project** 클릭
2. **macOS → App** 선택 → Next
3. 프로젝트 이름 입력, **Interface: SwiftUI**, **Language: Swift** 선택
4. 저장 위치 선택 → Create

---

# 3단계: Claude Code 설치 및 실행

```bash
# Node.js가 없다면 먼저 설치
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.zshrc
nvm install --lts && nvm use --lts

# Claude Code 설치
npm install -g @anthropic-ai/claude-code
```

프로젝트 폴더로 이동해 Claude Code 실행:

```bash
cd ~/Desktop/MyMacApp
claude
```

이렇게 요청해보세요:

> "이 SwiftUI macOS 앱에 메모장 기능을 만들어줘. 왼쪽에 메모 목록, 오른쪽에 편집 영역이 있는 2단 레이아웃으로 만들어줘. 메모는 로컬에 저장되게 해줘."

---

# 4단계: 빌드 및 실행

Xcode에서 ▶ (Run) 버튼 클릭 → macOS 앱이 바로 실행돼요.

Mac 앱은 시뮬레이터 없이 직접 Mac에서 실행되므로 바로 결과를 확인할 수 있어요.

***

**macOS 앱 특화 기능들 (Claude에게 요청해보세요):**
- 메뉴바 아이템 (`NSStatusItem`) — 상단 메뉴바에 앱 아이콘 추가
- 키보드 단축키 (`KeyboardShortcut`) — `Cmd+N`으로 새 항목 생성
- 드래그 앤 드롭 — 파일을 앱에 드래그해 열기
- 다크 모드 지원 — SwiftUI는 기본으로 지원됨

---

# 5단계: 기능 완성하기

> "툴바에 검색 기능을 추가해줘"  
> "메모를 .txt 파일로 내보낼 수 있게 해줘"  
> "앱 아이콘을 커스텀하게 만들어줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/macos/) — macOS 앱 개발 공식 가이드.
