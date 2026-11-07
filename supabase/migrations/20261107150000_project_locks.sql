-- 2026-11-07 관리자 잠금 — 유튜브 저작권 차단처럼 관리자가 비공개로 잠근 프로젝트는 주인·팀원이 다시 공개할 수 없다.
-- 주인은 계속 보고 고칠 수 있고(allowed_users 공유도 그대로), 공개로 바꾸는 것만 막는다. 풀기는 관리자가 /admin 에서.
-- 1) project_locks: 잠금 한 줄(이유는 선택). 서비스 키 전용(RLS 켜고 정책 없음) — 주인 안내는 서버가 서비스 키로 읽는다.
-- 2) 가드 projects_guard_locked: 사용자 키(anon/authenticated)로 잠긴 프로젝트를 public 으로 바꾸면 project_locked(42501).
--    INVOKER 여야 current_user 로 사용자 키를 가린다 — 잠금 판정은 API 로 안 열리는 private 스키마의 DEFINER 함수.
-- 3) admin_actions 에 'lock'·'unlock'.

CREATE TABLE public.project_locks (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 300),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_locks_created_by_idx ON public.project_locks (created_by);
ALTER TABLE public.project_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_locks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION private.project_is_locked(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_locks l WHERE l.project_id = p_project_id);
$$;
REVOKE ALL ON FUNCTION private.project_is_locked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.project_is_locked(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.projects_guard_locked()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.visibility = 'public'
     AND current_user IN ('anon', 'authenticated')
     AND private.project_is_locked(NEW.id) THEN
    RAISE EXCEPTION 'project_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_guard_locked
  BEFORE UPDATE OF visibility ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_locked();

ALTER TABLE public.admin_actions DROP CONSTRAINT admin_actions_action_check;
ALTER TABLE public.admin_actions
  ADD CONSTRAINT admin_actions_action_check
  CHECK (action IN ('delete', 'ban', 'unban', 'private', 'dismiss', 'revert', 'unhang', 'lock', 'unlock'));
