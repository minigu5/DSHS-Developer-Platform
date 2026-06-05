# Android 앱 만들기 — Claude Code (macOS)

Android 앱은 Kotlin 언어와 Android Studio로 만들어요.
Claude Code가 코드 작성을 도와주고, Android Studio로 빌드·실행합니다.

---

# 1단계: Android Studio 설치

1. [developer.android.com/studio](https://developer.android.com/studio) 에서 **macOS용** 다운로드
2. `.dmg` 파일 실행 → Android Studio를 Applications로 드래그
3. 처음 실행 시 **Standard** 설정 선택 → 설치 완료까지 기다리기 (시간이 걸려요)

설치 중에 Android SDK, 에뮬레이터 등이 자동으로 준비됩니다.

---

# 2단계: 새 프로젝트 생성

Android Studio 실행 후:

1. **New Project** 클릭
2. **Empty Activity** 템플릿 선택 → Next
3. 프로젝트 이름, 패키지 이름 입력 (예: `com.myname.myapp`)
4. **Language: Kotlin**, **Minimum SDK: API 26** 선택 → Finish

프로젝트가 생성되고 빌드가 완료될 때까지 잠시 기다려요.

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

Android Studio 프로젝트 폴더로 이동해 Claude Code를 실행하세요:

```bash
cd ~/AndroidStudioProjects/MyApp   # 프로젝트 폴더 경로(자기 컴퓨터의 경로로 바꾸기)
claude
```

이렇게 요청해보세요:

> "이 Android 앱에 할 일 목록 기능을 추가해줘. RecyclerView로 목록을 보여주고, FloatingActionButton으로 항목을 추가할 수 있게 해줘. Kotlin으로 작성해줘."

---

# 4단계: 에뮬레이터로 실행

Android Studio 상단 툴바에서:

1. **AVD Manager** (가상 기기 관리자) → Create Virtual Device
2. 원하는 기기 선택 (예: Pixel 8) → 최신 API 이미지 다운로드 → Finish
3. 초록색 ▶ (Run) 버튼 클릭 → 에뮬레이터에서 앱 실행

> **실기기 사용:** USB로 Android 폰 연결 후, 폰에서 개발자 옵션 → USB 디버깅 활성화하면 폰에서 직접 실행 가능해요.

---

# 5단계: 기능 추가하며 완성하기

에뮬레이터를 띄워놓고 Claude Code에 계속 기능을 요청하세요:

> "완료된 항목에 취소선을 그어줘"  
> "앱 테마 색을 파란색 계열로 바꿔줘"  
> "데이터를 로컬에 저장해서 앱을 껐다 켜도 유지되게 해줘"

코드가 업데이트되면 Android Studio에서 ▶ 버튼으로 다시 빌드해 확인하세요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Android 개발자 문서](https://developer.android.com/get-started) — 공식 가이드로 더 깊이 배우고 싶다면.
