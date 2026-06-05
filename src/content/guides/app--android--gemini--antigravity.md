# Google Antigravity + Android Studio로 Android 앱 만들기

Google Antigravity는 Gemini가 내장된 VS Code 기반 AI 코딩 IDE예요.
Android Studio와 함께 사용하면 Gemini가 Kotlin 코드를 직접 작성해줍니다.

---

# 1단계: Android Studio 설치

Android 앱 빌드에 반드시 필요해요.

**macOS**

1. [developer.android.com/studio](https://developer.android.com/studio) 에서 **macOS용** 다운로드
2. `.dmg` 파일 실행 → Android Studio를 Applications로 드래그
3. 처음 실행 시 **Standard** 설정 선택 → 설치 완료까지 기다리기

**Windows**

1. [developer.android.com/studio](https://developer.android.com/studio) 에서 **Windows용** 다운로드
2. `.exe` 설치 파일 실행 → 안내에 따라 설치
3. 처음 실행 시 **Standard** 설정 선택 → 설치 완료까지 기다리기

> **Windows에서 에뮬레이터가 느리다면:** BIOS에서 가상화 기술(Intel VT-x 또는 AMD-V)이 활성화되어 있는지 확인하세요.

---

# 2단계: Google Antigravity 설치

1. [antigravity.google/download](https://antigravity.google/download) 에서 내 OS에 맞는 버전 다운로드
2. 설치 후 실행 → **Google 계정**으로 로그인 (성인 인증 불필요)

---

# 3단계: Android Studio에서 새 프로젝트 생성

Android Studio에서:

1. **New Project** → **Empty Activity** 선택 → Next
2. 프로젝트 이름 입력, **Language: Kotlin**, **Minimum SDK: API 26** 선택 → Finish
3. 빌드가 완료될 때까지 잠시 기다려요

---

# 4단계: Antigravity에서 프로젝트 열기

1. Antigravity에서 **Open Folder** 클릭
2. 방금 만든 Android Studio 프로젝트 폴더 선택
   - macOS: `~/AndroidStudioProjects/MyApp`
   - Windows: `C:\Users\사용자이름\AndroidStudioProjects\MyApp`
3. Gemini 채팅창에 기능을 요청하세요:

> "이 Android 앱에 할 일 목록 기능을 추가해줘. Kotlin과 Jetpack Compose로, 항목 추가 버튼과 완료 체크박스가 있게 만들어줘."

Gemini가 Kotlin 파일을 직접 수정합니다. **Accept** 버튼으로 변경 사항을 적용하세요.

---

# 5단계: Android Studio에서 빌드 및 실행

코드 변경이 완료되면 Android Studio로 돌아와서:

1. **AVD Manager** → 에뮬레이터가 없다면 새로 생성 (Pixel 8 권장)
2. ▶ (Run) 버튼 클릭 → 에뮬레이터에서 앱 실행

> **실기기 사용:** USB로 Android 폰 연결 후, 폰에서 개발자 옵션 → USB 디버깅 활성화

에러가 나면 Android Studio의 오류 메시지를 Antigravity의 Gemini 채팅에 붙여넣으세요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Android 개발자 문서](https://developer.android.com/get-started) — 더 깊이 배우고 싶다면.
