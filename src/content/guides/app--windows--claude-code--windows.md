# Windows 데스크탑 앱 만들기 — Claude Code

Windows 앱은 .NET + WPF(또는 WinUI 3) 또는 Electron으로 만들 수 있어요.
Claude Code가 코드를 작성하고, Visual Studio로 빌드합니다.

---

# 1단계: 개발 도구 선택 및 설치

Windows 앱을 만드는 방법은 여러 가지예요. 초보자에게는 **Electron** 방식이 가장 쉽습니다.

| 방법 | 특징 | 추천 대상 |
|---|---|---|
| **Electron** | 웹 기술(HTML/CSS/JS)로 Windows 앱 제작 | 웹 개발 경험이 있거나 빠르게 시작하고 싶은 경우 |
| **WPF / WinUI 3** | .NET + C#, 진짜 네이티브 Windows 앱 | Windows 앱을 제대로 배우고 싶은 경우 |

**Electron 선택 시 — Node.js만 있으면 돼요:**
1. [nodejs.org](https://nodejs.org) 에서 LTS 버전 설치

**WPF/WinUI 선택 시 — Visual Studio 설치:**
1. [visualstudio.microsoft.com](https://visualstudio.microsoft.com) 에서 **Community** 버전 무료 다운로드
2. 설치 시 **.NET 데스크톱 개발** 워크로드 선택

---

# 2단계: Claude Code 설치

PowerShell(Windows Terminal)에서:

```powershell
npm install -g @anthropic-ai/claude-code
```

> 오류 시: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` 실행 후 재시도

---

# 3단계: 프로젝트 시작

**Electron 방식:**

```powershell
mkdir my-windows-app
cd my-windows-app
claude
```

Claude Code에 이렇게 요청하세요:

> "Electron으로 Windows 데스크탑 앱을 만들어줘. 메모를 작성하고 저장할 수 있는 메모장 앱이야. 모던한 디자인으로 만들어줘."

**WPF 방식:**

Visual Studio에서:
1. **새 프로젝트 만들기** → WPF 애플리케이션 선택 → 생성
2. 프로젝트 폴더에서 Claude Code 실행:

```powershell
cd C:\Users\사용자이름\source\repos\MyWpfApp
claude
```

> "이 WPF 앱에 메모 기능을 추가해줘. 왼쪽에 목록, 오른쪽에 편집 영역인 레이아웃으로 만들어줘. C#으로 작성해줘."

---

# 4단계: 빌드 및 실행

**Electron:**
```powershell
npm start   # Claude가 package.json을 만들어줬다면 바로 실행 가능
```

**WPF:**
Visual Studio에서 ▶ (시작) 버튼 클릭

---

# 5단계: 기능 추가하며 완성하기

> "시스템 트레이(알림 영역)에 앱 아이콘을 추가해줘"  
> "창 크기와 위치를 기억해서 다음에 열 때 유지되게 해줘"  
> "다크 모드를 지원하게 해줘"

===

# 다음으로 해볼 것

- [내 프로젝트 등록하기](/projects/new) — 만든 앱을 친구들과 공유해보세요.
- [개발 팁 둘러보기](/tips) — 다른 친구들의 노하우를 구경해보세요.
- [Electron 공식 문서](https://www.electronjs.org/docs/latest) — Electron으로 더 깊이 배우고 싶다면.
