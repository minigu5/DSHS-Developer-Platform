# 프로젝트 클릭 수 트래킹 + 인기순 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로젝트 외부 URL 클릭을 추적하여 인기순 정렬 및 상세 페이지 클릭 수 표시 기능을 추가한다.

**Architecture:** `/api/track?project=<id>` API 라우트가 프로젝트 ID로 외부 URL을 조회하고 Postgres RPC `track_project_click`을 호출해 중복 방지 후 `projects.click_count` 증가, 그 뒤 외부 URL로 리다이렉트한다. 탐색 페이지에서는 이미 클라이언트 사이드로 필터링 중이므로 정렬도 클라이언트 사이드로 추가한다. 상세 페이지에 클릭 수 stat을 추가한다.

**Tech Stack:** Next.js App Router (서버 컴포넌트 + API Route), Supabase PostgreSQL (PL/pgSQL RPC), TypeScript strict, Tailwind CSS v4

## Global Constraints

- TypeScript strict — `any` 금지
- shadcn `base-nova` Button은 `asChild` 미지원 — Link에 `buttonVariants()` 사용
- `"use client"` 는 상호작용 필요할 때만
- 모든 반응형: `기본값(모바일) sm:데스크탑` 패턴
- SQL 파일 번호 규칙: `docs/16-...sql` (이전 파일은 `15-`까지)
- Supabase RLS 항상 적용

---

## File Map

| 파일 | 역할 |
|------|------|
| `docs/16-supabase-click-tracking.sql` (new) | click_count 컬럼, project_clicks 테이블, RLS, RPC |
| `src/app/api/track/route.ts` (new) | 클릭 추적 + 외부 URL 리다이렉트 API |
| `src/lib/types.ts` (modify) | ProjectRow에 click_count 추가, project_clicks 테이블 타입 추가 |
| `src/components/projects/project-card.tsx` (modify) | ProjectCardData에 click_count 옵션 필드 추가 |
| `src/app/(nav)/explore/page.tsx` (modify) | PROJECT_SELECT에 click_count 추가 |
| `src/components/explore/explore-client.tsx` (modify) | 정렬 드롭다운 + 클라이언트 사이드 정렬 로직 |
| `src/app/(nav)/projects/[id]/page.tsx` (modify) | 웹사이트 방문 버튼 → /api/track 경유, 클릭 수 stat 표시 |

---

### Task 1: DB 마이그레이션

**Files:**
- Create: `docs/16-supabase-click-tracking.sql`

**Interfaces:**
- Produces: `projects.click_count INT DEFAULT 0`, `project_clicks` 테이블, `track_project_click(p_project_id, p_user_id, p_ip_hash)` RPC

- [ ] **Step 1: SQL 파일 작성**

`docs/16-supabase-click-tracking.sql` 생성:

```sql
-- 1. projects 테이블에 click_count 컬럼 추가
ALTER TABLE projects ADD COLUMN IF NOT EXISTS click_count INT DEFAULT 0 NOT NULL;

-- 2. project_clicks 중복 방지 테이블
CREATE TABLE IF NOT EXISTS project_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_hash TEXT,
  clicked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 중복 방지 인덱스 (로그인 유저: 하루 1회)
CREATE UNIQUE INDEX IF NOT EXISTS project_clicks_user_daily
  ON project_clicks (project_id, user_id, clicked_date)
  WHERE user_id IS NOT NULL;

-- 4. 중복 방지 인덱스 (비회원: IP 해시 기반 하루 1회)
CREATE UNIQUE INDEX IF NOT EXISTS project_clicks_ip_daily
  ON project_clicks (project_id, ip_hash, clicked_date)
  WHERE ip_hash IS NOT NULL;

-- 5. 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS project_clicks_project_id_idx ON project_clicks (project_id);

-- 6. RLS 활성화 (직접 접근 차단, RPC로만 사용)
ALTER TABLE project_clicks ENABLE ROW LEVEL SECURITY;

-- project_clicks 직접 SELECT/INSERT/UPDATE/DELETE 모두 거부
-- (RPC가 SECURITY DEFINER로 대신 처리)
CREATE POLICY "no_direct_access" ON project_clicks
  AS RESTRICTIVE
  FOR ALL
  USING (false);

-- 7. 원자적 클릭 추적 RPC (SECURITY DEFINER — RLS 우회)
CREATE OR REPLACE FUNCTION track_project_click(
  p_project_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count INT;
BEGIN
  INSERT INTO project_clicks (project_id, user_id, ip_hash, clicked_date)
  VALUES (p_project_id, p_user_id, p_ip_hash, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    UPDATE projects SET click_count = click_count + 1 WHERE id = p_project_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- RPC는 anon 및 authenticated 모두 호출 가능
GRANT EXECUTE ON FUNCTION track_project_click(UUID, UUID, TEXT) TO anon, authenticated;
```

- [ ] **Step 2: Supabase에서 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 전체 붙여넣기 → Run.
또는:
```bash
# (supabase CLI 설치된 경우)
supabase db push
```

확인: `projects` 테이블에 `click_count` 컬럼 존재, `project_clicks` 테이블 존재.

- [ ] **Step 3: types.ts 업데이트**

`src/lib/types.ts`에서 `projects.Row`에 `click_count` 추가, `project_clicks` 테이블 추가:

```typescript
// projects.Row 에 추가 (feature_custom 다음 줄):
click_count: number;

// projects.Update 에 추가:
click_count?: number;

// Tables 객체에 project_clicks 테이블 추가 (ideas 다음):
project_clicks: {
  Row: {
    id: string;
    project_id: string;
    user_id: string | null;
    ip_hash: string | null;
    clicked_date: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    project_id: string;
    user_id?: string | null;
    ip_hash?: string | null;
    clicked_date?: string;
    created_at?: string;
  };
  Update: never;
  Relationships: [
    {
      foreignKeyName: 'project_clicks_project_id_fkey';
      columns: ['project_id'];
      referencedRelation: 'projects';
      referencedColumns: ['id'];
    },
  ];
};
```

- [ ] **Step 4: 커밋**

```bash
git add docs/16-supabase-click-tracking.sql src/lib/types.ts
git commit -m "feat: add click_count to projects and project_clicks dedup table"
```

---

### Task 2: 클릭 트래킹 API 라우트

**Files:**
- Create: `src/app/api/track/route.ts`

**Interfaces:**
- Consumes: `track_project_click` RPC (Task 1), `createClient` from `@/lib/supabase/server`
- Produces: `GET /api/track?project=<uuid>` → 302 redirect to `project.url`

- [ ] **Step 1: API 라우트 파일 생성**

`src/app/api/track/route.ts` 생성:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function buildIpHash(request: NextRequest): Promise<string> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const ua = request.headers.get("user-agent") || "";
  const raw = new TextEncoder().encode(ip + "|" + ua);
  const buf = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project");

  if (!projectId) {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  const supabase = await createClient();

  // 프로젝트 URL 조회 (open redirect 방지: to 파라미터 미사용)
  const { data: project } = await supabase
    .from("projects")
    .select("url")
    .eq("id", projectId)
    .single();

  const targetUrl = project?.url;
  if (!targetUrl) {
    return NextResponse.redirect(new URL("/explore", request.url));
  }

  // 로그인 유저 또는 IP 해시로 중복 방지
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId: string | null = user?.id ?? null;
  const ipHash: string | null = userId ? null : await buildIpHash(request);

  // 원자적 클릭 추적 (중복이면 RPC가 false 반환, count 증가 안 함)
  await supabase.rpc("track_project_click", {
    p_project_id: projectId,
    p_user_id: userId,
    p_ip_hash: ipHash,
  });

  return NextResponse.redirect(targetUrl, { status: 302 });
}
```

- [ ] **Step 2: 동작 확인**

`npm run dev` 실행 후 브라우저에서:
```
http://localhost:3000/api/track?project=<실제 프로젝트 ID>
```
→ 프로젝트의 `url`로 리다이렉트되는지 확인.
→ Supabase에서 `project_clicks` 테이블에 행이 생겼는지, `projects.click_count`가 1 증가했는지 확인.
→ 같은 URL 재방문 시 count가 증가하지 않는지 확인 (하루 1회 제한).

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/track/route.ts
git commit -m "feat: add /api/track redirect endpoint with per-day dedup"
```

---

### Task 3: explore 페이지 — click_count 쿼리 + 정렬 UI

**Files:**
- Modify: `src/components/projects/project-card.tsx` (ProjectCardData 타입)
- Modify: `src/app/(nav)/explore/page.tsx` (PROJECT_SELECT)
- Modify: `src/components/explore/explore-client.tsx` (정렬 드롭다운 + 정렬 로직)

**Interfaces:**
- Consumes: `projects.click_count` (Task 1)
- Produces: `ProjectCardData.click_count?: number | null`, 정렬된 프로젝트 목록

- [ ] **Step 1: ProjectCardData 타입에 click_count 추가**

`src/components/projects/project-card.tsx`에서 `ProjectCardData` 타입에 필드 추가:

```typescript
export type ProjectCardData = {
  id: string;
  title: string;
  short_description: string | null;
  type: string;
  platforms: string[] | null;
  author_role: 'individual' | 'team' | null;
  team_name: string | null;
  icon_url: string | null;
  features: string[] | null;
  author_id: string;
  visibility?: 'public' | 'private' | null;
  users: { full_name: string | null; nickname: string | null; avatar_url: string | null } | { full_name: string | null; nickname: string | null; avatar_url: string | null }[] | null;
  reviews?: { rating: number }[] | null;
  click_count?: number | null;  // ← 추가
};
```

- [ ] **Step 2: explore/page.tsx PROJECT_SELECT에 click_count 추가**

`src/app/(nav)/explore/page.tsx`에서:

```typescript
const PROJECT_SELECT = `
  id,
  title,
  short_description,
  type,
  platforms,
  author_role,
  team_name,
  icon_url,
  features,
  author_id,
  visibility,
  click_count,
  users (*),
  reviews(rating)
`;
```

- [ ] **Step 3: ExploreClient에 정렬 상태 + 드롭다운 추가**

`src/components/explore/explore-client.tsx` 상단 import에 `ArrowUpDown` 추가:

```typescript
import {
  // ... 기존 import ...
  ArrowUpDown,
} from "lucide-react";
```

`ExploreClient` 함수 안 기존 상태 변수들 다음에 정렬 상태 추가:

```typescript
const [sortBy, setSortBy] = useState<'newest' | 'clicks' | 'rating'>('newest');
const [sortOpen, setSortOpen] = useState(false);
```

`filteredProjects` useMemo를 다음으로 교체 (필터 + 정렬 통합):

```typescript
const filteredProjects = useMemo(() => {
  const q = searchQuery.toLowerCase();
  const filtered = initialProjects.filter(project => {
    const title = project.title ?? "";
    const shortDesc = project.short_description ?? "";
    const tags = project.features ?? [];
    const platforms = project.platforms ?? [];
    const type = project.type;

    const author = Array.isArray(project.users) ? project.users[0] : project.users;
    const authorNames = [author?.nickname, author?.full_name, project.team_name].filter(
      (name): name is string => Boolean(name),
    );

    const matchesSearch =
      !q ||
      title.toLowerCase().includes(q) ||
      shortDesc.toLowerCase().includes(q) ||
      tags.some(tag => tag.toLowerCase().includes(q)) ||
      authorNames.some(name => name.toLowerCase().includes(q));

    const matchesPlatform =
      selectedPlatforms.length === 0 ||
      selectedPlatforms.some(platform => platforms.includes(platform));

    const matchesType =
      selectedTypes.length === 0 ||
      selectedTypes.includes(type);

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some(cat => tags.includes(cat));

    return matchesSearch && matchesPlatform && matchesType && matchesCategory;
  });

  if (sortBy === 'clicks') {
    return [...filtered].sort((a, b) => (b.click_count ?? 0) - (a.click_count ?? 0));
  }
  if (sortBy === 'rating') {
    return [...filtered].sort((a, b) => {
      const getAvg = (p: typeof a) => {
        const rated = (p.reviews ?? []).filter(r => r.rating != null);
        return rated.length > 0 ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0;
      };
      return getAvg(b) - getAvg(a);
    });
  }
  // newest: 서버에서 created_at DESC로 정렬되어 옴
  return filtered;
}, [searchQuery, selectedPlatforms, selectedTypes, selectedCategories, initialProjects, sortBy]);
```

- [ ] **Step 4: 정렬 드롭다운 UI 추가**

`src/components/explore/explore-client.tsx`에서 `"모든 프로젝트"` 헤더 행(`mb-6 flex justify-between` div)을 다음으로 교체:

```tsx
<div className="mb-6 flex justify-between items-center gap-2">
  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
    모든 프로젝트 <span className="text-zinc-400 text-base font-normal ml-2">({filteredProjects.length})</span>
  </h2>

  {/* 정렬 드롭다운 */}
  <div className="relative shrink-0">
    <button
      type="button"
      onClick={() => setSortOpen(o => !o)}
      className="flex items-center gap-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
    >
      <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
      <span className="hidden sm:inline">
        {sortBy === 'newest' ? '최신순' : sortBy === 'clicks' ? '인기순' : '별점순'}
      </span>
    </button>
    {sortOpen && (
      <div className="absolute right-0 top-full mt-1 z-30 min-w-[112px] rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
        {([
          { value: 'newest', label: '최신순' },
          { value: 'clicks', label: '인기순' },
          { value: 'rating', label: '별점순' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
            className={cn(
              "w-full px-4 py-2.5 text-sm text-left font-medium transition-colors",
              sortBy === opt.value
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 5: 정렬 드롭다운 외부 클릭 닫기 (선택)**

sortOpen 드롭다운이 열린 상태에서 외부 클릭 시 닫으려면 컴포넌트에 useEffect 추가. 필요하면 추가:

```typescript
useEffect(() => {
  if (!sortOpen) return;
  const handler = () => setSortOpen(false);
  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}, [sortOpen]);
```

- [ ] **Step 6: 타입 에러 확인**

```bash
npx tsc --noEmit
```

에러 0개 확인.

- [ ] **Step 7: 커밋**

```bash
git add src/components/projects/project-card.tsx src/app/(nav)/explore/page.tsx src/components/explore/explore-client.tsx
git commit -m "feat: add click_count to explore query and sort dropdown"
```

---

### Task 4: 프로젝트 상세 페이지 — 버튼 교체 + 클릭 수 표시

**Files:**
- Modify: `src/app/(nav)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/track?project=<id>` (Task 2), `project.click_count` (Task 1 via `projects` select)

- [ ] **Step 1: 상세 페이지 query에 click_count 포함 확인**

`src/app/(nav)/projects/[id]/page.tsx`에서 `projects` select 쿼리:

```typescript
const [projectResult, reviewsResult] = await Promise.all([
  queryClient
    .from('projects')
    .select(`*, users (*)`)  // *에 click_count 포함됨
    .eq('id', id)
    .single(),
  // ...
]);
```

`*` 와일드카드가 `click_count`도 포함하므로 쿼리 변경 불필요. `project.click_count`로 접근 가능.

- [ ] **Step 2: 웹사이트 방문 버튼을 /api/track 경유로 교체**

`src/app/(nav)/projects/[id]/page.tsx`에서 기존:

```tsx
{project.url && (
  <a href={project.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg" }), "rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium")}>
    <ExternalLink className="w-4 h-4 mr-2" /> 웹사이트 방문
  </a>
)}
```

를 다음으로 교체:

```tsx
{project.url && (
  <a
    href={`/api/track?project=${project.id}`}
    target="_blank"
    rel="noreferrer"
    className={cn(buttonVariants({ size: "lg" }), "rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium")}
  >
    <ExternalLink className="w-4 h-4 mr-2" /> 웹사이트 방문
  </a>
)}
```

- [ ] **Step 3: 클릭 수 stat 추가**

`src/app/(nav)/projects/[id]/page.tsx`에서 리뷰 별점 행 (`flex items-center gap-2 mb-8`) 안, 리뷰 수 바로 다음에 클릭 수 추가. import에 `MousePointerClick` 추가 필요:

```typescript
import { Globe, Code2, Lock, Star, ExternalLink, ShieldCheck, ShieldAlert, MousePointerClick } from "lucide-react";
```

별점+리뷰 행 (`<div className="flex items-center gap-2 mb-8 text-sm">`)을 다음으로 교체:

```tsx
<div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
  <div className="flex items-center gap-2">
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-4 h-4",
            n <= Math.round(avgRating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-zinc-300 dark:text-zinc-600",
          )}
        />
      ))}
    </div>
    {reviewCount > 0 ? (
      <span className="text-zinc-600 dark:text-zinc-400">
        {avgRating.toFixed(1)} · 리뷰 {reviewCount}개
      </span>
    ) : (
      <span className="text-zinc-500">아직 리뷰가 없습니다</span>
    )}
  </div>
  {project.url && (
    <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
      <MousePointerClick className="w-4 h-4" />
      <span>{project.click_count ?? 0}회 방문</span>
    </div>
  )}
</div>
```

- [ ] **Step 4: 타입 에러 확인**

```bash
npx tsc --noEmit
```

에러 0개 확인.

- [ ] **Step 5: 동작 확인**

```bash
npm run dev
```

1. 프로젝트 상세 페이지 열기 → "N회 방문" stat 표시되는지 확인.
2. "웹사이트 방문" 버튼 클릭 → 새 탭에서 외부 사이트로 이동하는지 확인.
3. Supabase에서 `project_clicks` 행 생성 + `projects.click_count` 증가 확인.
4. 같은 프로젝트 URL 재클릭 → 오늘은 count 증가 안 함 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/app/(nav)/projects/[id]/page.tsx
git commit -m "feat: track external URL clicks and display visit count on project detail"
```
