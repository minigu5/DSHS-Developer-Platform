-- ideas 테이블에 구현 완료 프로젝트 연결 컬럼 추가
ALTER TABLE public.ideas
  ADD COLUMN linked_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
