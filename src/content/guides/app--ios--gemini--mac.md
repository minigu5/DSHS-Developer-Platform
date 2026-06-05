# iOS 앱 만들기 — Google Antigravity (macOS)

iOS 앱은 Swift + SwiftUI로 만들어요. macOS에서만 개발할 수 있습니다.
Google Antigravity의 Gemini가 코드 작성을 도와주고, Xcode로 빌드·실행합니다.

---

# 1단계: Xcode 설치

Xcode는 iOS 앱 빌드에 반드시 필요해요.

1. [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835?l=ko&mt=12)에서 **Xcode** 설치 (용량이 커서 시간이 걸려요)
2. 설치 완료 후 Xcode를 한 번 실행해 추가 컴포넌트 설치 허용

```bash
# 터미널에서 커맨드 라인 도구도 설치
xcode-select --install
```

---

# 2단계: Google Antigravity 설치

1. [antigravity.google/download](https://antigravity.google/download) 에서 **macOS용** 다운로드
2. 설치 후 실행 → Google 계정으로 로그인

---

# 3단계: iOS 프로젝트 시작

Antigravity에서:

1. **New Project** 클릭 → 저장할 폴더 선택
2. Gemini 채팅창에 이렇게 요청하세요:

> "SwiftUI로 iOS 앱을 만들어줘. 할 일 목록을 보여주고, 항목을 추가·삭제·완료 처리할 수 있는 앱이야. Xcode 프로젝트 구조로 만들어줘."

Gemini가 Swift 파일들과 프로젝트 구조를 자동으로 생성합니다. **Accept** 버튼으로 모두 적용하세요.

---

# 4단계: Xcode에서 빌드 및 실행

1. Xcode 실행 → **Open Existing Project**
2. Antigravity에서 만든 프로젝트 폴더의 `.xcodeproj` 파일 선택
3. 상단에서 iPhone 시뮬레이터 선택 (예: iPhone 16)
4. ▶ (Run) 버튼 클릭

> **팁:** Antigravity에서 코드를 수정한 뒤에는 Xcode에서 다시 ▶ 를 눌러 빌드하세요.

---

# 5단계: Gemini와 함께 기능 완성하기

Antigravity의 Gemini 채팅창에 이어서 요청하세요:

> "항목을 왼쪽으로 스와이프하면 삭제되게 해줘"  
> "앱 아이콘 색을 파란색으로 바꿔줘"  
> "데이터가 앱을 껐다 켜도 유지되게 UserDefaults로 저장해줘"

에러가 나면 Xcode 오류 메시지를 Gemini 채팅에 붙여넣으면 자동으로 수정해줘요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Apple 개발자 문서](https://developer.apple.com/tutorials/swiftui) — SwiftUI 공식 튜토리얼로 더 배우고 싶다면.
