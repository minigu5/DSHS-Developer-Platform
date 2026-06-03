-- 기존 projects 테이블 구조 확장 스크립트

-- 1. 새로운 컬럼들 추가
ALTER TABLE public.projects 
ADD COLUMN short_description text,
ADD COLUMN url text,
ADD COLUMN author_role text default 'individual' check (author_role in ('individual', 'team')),
ADD COLUMN team_name text,
ADD COLUMN team_members text[],
ADD COLUMN icon_url text,
ADD COLUMN icon_type text check (icon_type in ('upload', 'auto')),
ADD COLUMN license_features text[],
ADD COLUMN license_custom text;

-- 2. 기존 데이터 마이그레이션 (선택적)
-- 기존 레코드가 있는 경우, 새롭게 NOT NULL 또는 필수인 정보의 기본값을 세팅해주는 것이 좋습니다.
-- UPDATE public.projects SET short_description = substring(description, 1, 100) WHERE short_description IS NULL;

-- 3. Storage 버킷 설정 (선택적: 아이콘 업로드용)
-- 아이콘 이미지를 업로드할 'project-icons' 버킷이 없는 경우 생성 및 권한 설정
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-icons', 'project-icons', true);

-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'project-icons');
-- CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-icons' AND auth.uid() = owner);
