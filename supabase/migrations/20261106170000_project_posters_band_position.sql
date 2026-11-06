-- 2026-11-06 AI 포스터: 띠를 위·아래 중 어디에 붙일지 (사용자 요청). 서비스 키 전용 표라 GRANT 는 필요 없다.
ALTER TABLE public.project_posters
  ADD COLUMN band_position text NOT NULL DEFAULT 'bottom' CHECK (band_position IN ('top', 'bottom'));
