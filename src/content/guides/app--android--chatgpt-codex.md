# Android 앱 만들기 — ChatGPT Codex

Android 앱은 Kotlin + Android Studio로 만들어요.
ChatGPT Codex가 코드를 작성하고, Android Studio로 빌드·실행합니다.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 내 OS에 맞는 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인 (무료 플랜도 사용 가능)

---

# 2단계: Android Studio 설치

**macOS**

1. [developer.android.com/studio](https://developer.android.com/studio) 에서 **macOS용** 다운로드
2. `.dmg` 파일 실행 → Android Studio를 Applications로 드래그
3. 처음 실행 시 **Standard** 설정 선택 → SDK, 에뮬레이터 자동 설치 (시간이 걸려요)

**Windows**

1. [developer.android.com/studio](https://developer.android.com/studio) 에서 **Windows용** 다운로드
2. `.exe` 설치 파일 실행 → 안내에 따라 설치
3. 처음 실행 시 **Standard** 설정 선택 → SDK, 에뮬레이터 자동 설치 (시간이 걸려요)

---

# 3단계: 새 Android 프로젝트 생성

Android Studio 실행 후:

1. **New Project** → **Empty Activity** → Next
2. 프로젝트 이름 입력, **Language: Kotlin**, **Minimum SDK: API 26** 선택 → Finish
3. 빌드가 완료될 때까지 기다리기

---

# 4단계: ChatGPT Codex로 코드 작성

Codex 앱에서:

1. **New Task** → Android Studio 프로젝트 폴더 선택
   - macOS: `~/AndroidStudioProjects/MyApp`
   - Windows: `C:\Users\사용자이름\AndroidStudioProjects\MyApp`
2. 채팅창에 이렇게 요청하세요:

> "이 Android 앱에 할 일 목록 기능을 추가해줘. RecyclerView로 목록을 보여주고, FloatingActionButton으로 항목을 추가할 수 있게 해줘. Kotlin으로 작성해줘."

Codex가 파일을 수정하면 **Accept** 버튼으로 적용하세요.

---

# 5단계: 에뮬레이터로 실행

Android Studio 상단에서:

1. **AVD Manager** → **Create Virtual Device** → 기기 선택 (예: Pixel 8) → 최신 API 이미지 다운로드 → Finish
2. ▶ (Run) 버튼 클릭 → 에뮬레이터에서 앱 실행

> **Windows에서 에뮬레이터가 느리다면:** BIOS에서 가상화 기술(Intel VT-x 또는 AMD-V) 활성화를 확인하세요.  
> **실기기 사용:** Android 폰을 USB로 연결하고, 개발자 옵션 → USB 디버깅을 켜면 폰에서 직접 실행 가능해요.

에러가 나면 에러 메시지를 Codex 채팅에 붙여넣으세요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Android 개발자 문서](https://developer.android.com/get-started) — 더 깊이 배우고 싶다면.
