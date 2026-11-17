-- 2026-11-17 이벤트·수상 — 관리자가 이벤트(예: 2026 AI-SW 개발 해커톤 주간)를 만들고 프로젝트에 등위(예: 1위)를 매기면
-- 프로젝트 목록·상세에 "이벤트명 · 등위" 배지가 보인다.
-- 1) events: 이벤트 이름. 누구나 읽는다(이름뿐이라 비밀 없음). 쓰기는 서비스 키(관리자 액션)뿐.
-- 2) project_awards: 프로젝트 × 이벤트 × 등위 문구. 프로젝트가 보이는 사람에게만 보인다(비공개 프로젝트의 수상이 새지 않게
--    projects RLS 에 맡김 — 익명 프로젝트 주인 칸(author_id)은 건드리지 않으므로 익명이 풀릴 일 없음).
--    한 프로젝트가 같은 이벤트에서 등위를 둘 받을 수는 없다(UNIQUE) — 공동 수상은 "공동 1위"처럼 문구로.

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX events_name_key ON public.events (lower(btrim(name)));
CREATE INDEX events_created_by_idx ON public.events (created_by);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.events FROM anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
CREATE POLICY events_select_all ON public.events FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.project_awards (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  rank_label text NOT NULL CHECK (char_length(btrim(rank_label)) BETWEEN 1 AND 20),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, event_id)
);
CREATE INDEX project_awards_event_idx ON public.project_awards (event_id);
CREATE INDEX project_awards_created_by_idx ON public.project_awards (created_by);
ALTER TABLE public.project_awards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_awards FROM anon, authenticated;
GRANT SELECT (project_id, event_id, rank_label, created_at) ON public.project_awards TO anon, authenticated;
-- 프로젝트 RLS 에 맡긴다: 그 프로젝트를 읽을 수 있을 때만 수상도 보인다
CREATE POLICY project_awards_select ON public.project_awards FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id));

ALTER TABLE public.admin_actions DROP CONSTRAINT admin_actions_action_check;
ALTER TABLE public.admin_actions
  ADD CONSTRAINT admin_actions_action_check
  CHECK (action IN ('delete', 'ban', 'unban', 'private', 'dismiss', 'revert', 'unhang', 'lock', 'unlock', 'event', 'award'));
