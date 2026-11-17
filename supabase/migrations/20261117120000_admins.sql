-- 2026-11-17 관리자를 관리자 화면에서 추가·삭제.
-- 지금까지 관리자 = 이메일 하나(ts250024@ts.hs.kr)를 SQL 함수 두 곳(is_admin, subdomain_is_developer)에 박아 두었다.
-- 사용자 결정: 관리자끼리 서로 추가·삭제할 수 있되, 최초 관리자는 건드릴 수 없다.
--   → 최초 관리자는 표에 넣지 않고 두 함수에 그대로 둔다(행이 없으니 지울 수 없고, 추가 목록에도 안 들어간다).
-- admins 는 RLS 켜고 정책 없음 + anon/authenticated 권한 회수 = 서비스 키(관리자 서버 액션) 전용.
-- 함수 시그니처·권한은 그대로(CREATE OR REPLACE)라 is_admin() 을 쓰는 RLS 정책·트리거는 손대지 않는다.

CREATE TABLE public.admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  added_by   uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admins_added_by_idx ON public.admins (added_by);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = (SELECT auth.uid())
      AND (
        u.email = 'ts250024@ts.hs.kr'
        OR EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.subdomain_is_developer(p_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
  SELECT p_user IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p_user
      AND (
        u.email = 'ts250024@ts.hs.kr'
        OR EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = u.id)
      )
  );
$$;

ALTER TABLE public.admin_actions DROP CONSTRAINT admin_actions_action_check;
ALTER TABLE public.admin_actions
  ADD CONSTRAINT admin_actions_action_check
  CHECK (action IN ('delete', 'ban', 'unban', 'private', 'dismiss', 'revert', 'unhang', 'lock', 'unlock', 'event', 'award', 'admin_add', 'admin_remove'));
