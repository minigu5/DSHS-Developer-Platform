# Google AI Studio로 Android 앱 만들기

Google AI Studio는 브라우저에서 바로 Android 앱을 만들 수 있는 도구예요.
코드를 직접 짤 필요 없이, 아이디어를 설명하면 Gemini가 완성된 앱을 만들어줍니다.

> ⚠️ **성인 인증된 Google 계정**이 필요합니다. 학교 계정이 막혀 있을 수 있어요.
> 개인 Google 계정으로 [myaccount.google.com](https://myaccount.google.com) 에서 연령 인증을 완료하세요.

---

# 1단계: Google AI Studio 접속

1. [aistudio.google.com](https://aistudio.google.com) 에 접속
2. 성인 인증된 Google 계정으로 로그인
3. 왼쪽 사이드바에서 **Build** 클릭

---

# 2단계: Android 플랫폼 선택

Build 모드 화면에서:

1. 플랫폼 선택 드롭다운 → **Android** 선택
2. 하단 입력창이 활성화됩니다

---

# 3단계: 앱 아이디어 설명

입력창에 만들고 싶은 앱을 자세히 설명하세요:

> "할 일 목록 앱을 만들어줘. 할 일을 추가·삭제하고, 완료 체크박스로 처리할 수 있어야 해. 파란색 테마로 만들어줘."

Gemini가 Kotlin + Jetpack Compose로 완성된 앱 코드를 자동 생성하고, 화면 오른쪽의 **Android 에뮬레이터**에서 바로 실행합니다!

---

# 4단계: 에뮬레이터에서 확인 및 수정

오른쪽 Android 에뮬레이터에서 앱이 실행되면 동작을 확인하세요.

원하는 대로 바뀌지 않았다면 이어서 요청하세요:

> "버튼 색상을 좀 더 밝게 해줘"  
> "완료된 항목은 회색으로 흐리게 표시해줘"  
> "앱 이름을 상단 바에 표시해줘"

---

# 5단계: 실기기에 설치하기 (선택)

**방법 1 — ADB로 설치:**
1. 폰에서 **설정 → 개발자 옵션 → USB 디버깅** 활성화
2. USB로 컴퓨터에 연결
3. AI Studio에서 **Install on Device** 버튼 클릭

**방법 2 — APK 파일 전송:**
1. AI Studio에서 **Download APK** 클릭
2. APK 파일을 Google Drive나 카카오톡으로 폰에 전송
3. 폰에서 파일 열기 → 알 수 없는 출처 허용 → 설치

> **제한 사항:** AI Studio로 만든 앱은 서버·로그인·Firebase 없는 단순 앱만 지원해요.
> 더 복잡한 앱은 Android Studio로 넘어가는 것을 추천합니다.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Android 개발자 문서](https://developer.android.com/get-started) — 더 복잡한 앱에 도전하고 싶다면.
