-- 사용자 연락처 정보를 저장하는 contacts 컬럼 추가
-- contacts 형식: [{ "type": "github"|"email"|"instagram"|"discord"|"website", "value": "..." }]

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS contacts jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.users.contacts IS
  '연락처 목록. 각 항목: { "type": "github"|"email"|"instagram"|"discord"|"website", "value": "..." }';
