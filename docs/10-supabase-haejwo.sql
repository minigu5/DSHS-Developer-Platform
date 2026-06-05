-- "해줘" 아이디어 요청 기능 스키마
-- 비개발자가 아이디어를 등록하고 개발자에게 구현을 요청하는 테이블

CREATE TABLE public.ideas (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id  uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title      text NOT NULL,
  type       text NOT NULL,
  category   text NOT NULL,
  content    text NOT NULL,
  status     text DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ideas"
  ON public.ideas FOR SELECT USING (true);

CREATE POLICY "Logged-in users can create ideas"
  ON public.ideas FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own ideas"
  ON public.ideas FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own ideas"
  ON public.ideas FOR DELETE USING (auth.uid() = author_id);

CREATE OR REPLACE FUNCTION update_ideas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION update_ideas_updated_at();
