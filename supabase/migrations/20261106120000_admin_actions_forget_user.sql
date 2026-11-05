-- 2026-11-05 탈퇴하면 관리 기록(admin_actions)에 남은 그 사람의 id 도 지운다.
-- target_user_id 는 FK 가 SET NULL 하지만, 차단 기록은 target_id 칸에도 사용자 id 를 문자열로 넣는다.
-- 처리방침 "차단 기록은 지워요"(탈퇴 시)와 맞춘다. users 행이 지워질 때(auth.users CASCADE 포함) 돈다.

CREATE OR REPLACE FUNCTION public.admin_actions_forget_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.admin_actions
     SET target_id = NULL, detail = NULL
   WHERE target_user_id = OLD.id OR (target_kind = 'user' AND target_id = OLD.id::text);
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_actions_forget_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER admin_actions_forget_user BEFORE DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.admin_actions_forget_user();
