---
paths:
  - "src/app/**/developers/**"
  - "src/lib/profile/**"
---

# 개발자 프로필

> CLAUDE.md에서 옮겨 온 기능 문서(2026-11-02). 위 경로의 파일을 열면 자동으로 불러온다. 이 기능의 결정·변경 사항은 이 파일에 적는다.

### 개발자 프로필 페이지 (`src/app/(nav)/developers/[id]/page.tsx`)
- **머리(2026-10-24)**: `PageHero`의 `avatar` 변형 — 아바타 스티커(104px, `ring-[3px]` + 그림자) → 닉네임 h1(없으면 실명) → **실명 알약**(닉네임이 있을 때만, `users.full_name` = "기수 이름" 형식이라 기수도 같이 나옴; 2026-10-24 사용자 요청으로 복구) → 자기소개 → **연락처 알약**(아이콘 + 값) → 관심분야 칩. **이메일 줄은 머리에 두지 않는다**; 이메일은 연락처 알약 하나로 항상 노출(`contacts`에 email이 있으면 그것만, 없으면 학교 이메일). 본인이면 알약 아래 "프로필 설정"(다이얼로그) + "로그아웃"(`sign-out-button.tsx`).
- **아래 구간**: zinc-50 띠 "내 프로젝트/등록한 프로젝트 N"(2열 `ProjectCard`, 본인이면 `manage` 모드 + 점선 "새 프로젝트 등록" 칸). 목록은 `author_id = 프로필 id` **또는** `team_members`에 프로필 이메일이 든 프로젝트(`.or("author_id.eq.…,team_members.cs.{\"이메일\"}")`) — 팀으로 등록된 프로젝트도 팀원 프로필에 나온다(2026-10-25) → 흰 구간 "작성한 글 N"(팁·해줘를 한 목록에 얇은 행, 최근 6개). `/me`는 본인 프로필로 리다이렉트(별도 페이지 없음).
- **연락처**: `users.contacts` JSONB 배열 — `{ type: 'github'|'email'|'instagram'|'discord'|'website', value: string }[]`. 프로필 설정 다이얼로그에서 추가/제거(최대 8개). GitHub·인스타그램은 username만 입력하면 URL 자동 변환. `docs/14-supabase-users-contacts.sql` 실행 필요.
- **프로필 설정 다이얼로그** (`profile-settings-dialog.tsx`): 닉네임·자기소개·아바타·관심분야·연락처 편집. `updateProfile` 서버 액션으로 저장.
