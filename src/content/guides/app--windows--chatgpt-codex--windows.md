# Windows 데스크탑 앱 만들기 — ChatGPT Codex

Windows 앱은 .NET + WPF(또는 Electron)로 만들 수 있어요.
ChatGPT Codex가 코드를 작성하고, Visual Studio로 빌드합니다.

---

# 1단계: ChatGPT Codex 앱 설치 및 로그인

1. [chatgpt.com/codex](https://chatgpt.com/codex) 에서 **Windows용** 앱 다운로드 및 설치
2. 앱 실행 → ChatGPT 계정으로 로그인 (무료 플랜도 사용 가능)

---

# 2단계: 개발 도구 선택 및 설치

| 방법 | 특징 | 추천 대상 |
|---|---|---|
| **Electron** | 웹 기술(HTML/CSS/JS)로 Windows 앱 제작, 간단함 | 빠르게 시작하고 싶은 경우 |
| **WPF / WinUI 3** | .NET + C#, 네이티브 Windows 앱 | Windows 앱을 제대로 배우고 싶은 경우 |

**Electron 선택 시 — Node.js 설치:**
1. [nodejs.org](https://nodejs.org) 에서 LTS 버전 다운로드 및 설치

**WPF/WinUI 선택 시 — Visual Studio 설치:**
1. [visualstudio.microsoft.com](https://visualstudio.microsoft.com) 에서 Community(무료) 다운로드
2. 설치 시 **.NET 데스크톱 개발** 워크로드 선택

---

# 3단계: 새 프로젝트 생성

**Electron 방식:** 바탕화면에 `my-windows-app` 폴더 생성 후 Codex에서 열기

**WPF 방식:** Visual Studio → 새 프로젝트 만들기 → **WPF 애플리케이션** 선택 → 생성 후 프로젝트 폴더 경로 메모

---

# 4단계: ChatGPT Codex로 코드 작성

Codex 앱에서:

1. **New Task** → 프로젝트 폴더 선택
2. 채팅창에 이렇게 요청하세요:

**Electron 방식:**
> "Electron으로 Windows 데스크탑 앱을 만들어줘. 메모를 작성하고 저장할 수 있는 메모장 앱이야. 모던한 디자인으로 만들어줘."

**WPF 방식:**
> "이 WPF 앱에 메모 기능을 추가해줘. 왼쪽에 목록, 오른쪽에 편집 영역인 레이아웃으로, C#으로 작성해줘."

Codex가 파일을 수정하면 **Accept** 버튼으로 적용하세요.

---

# 5단계: 빌드 및 실행

**Electron:** PowerShell에서 `npm start`  
**WPF:** Visual Studio에서 ▶ (시작) 버튼 클릭

에러가 나면 에러 메시지를 Codex 채팅에 붙여넣으세요.

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Electron 공식 문서](https://www.electronjs.org/docs/latest) — Electron으로 더 깊이 배우고 싶다면.
