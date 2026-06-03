-- 1. 유저 (Users) 테이블 생성
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null check (email like '%@ts.hs.kr'),
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 유저 테이블 RLS 활성화 및 정책
alter table public.users enable row level security;

create policy "누구나 유저 정보를 조회할 수 있습니다."
  on public.users for select
  using (true);

create policy "자신의 프로필만 수정할 수 있습니다."
  on public.users for update
  using (auth.uid() = id);

-- (선택) Auth 회원가입 시 자동으로 users 테이블에 레코드를 생성하는 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. 프로젝트 (Projects) 테이블 생성
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text not null,
  type text not null,
  platforms text[] not null default '{}',
  source_type text not null,
  repo_url text,
  license text not null,
  features text[] not null default '{}',
  visibility text not null check (visibility in ('public', 'private')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 프로젝트 테이블 RLS 활성화 및 정책
alter table public.projects enable row level security;

create policy "public 프로젝트는 누구나 볼 수 있습니다."
  on public.projects for select
  using (visibility = 'public');

create policy "private 프로젝트는 작성자만 볼 수 있습니다."
  on public.projects for select
  using (visibility = 'private' and auth.uid() = author_id);

create policy "로그인한 사용자는 프로젝트를 등록할 수 있습니다."
  on public.projects for insert
  with check (auth.uid() = author_id);

create policy "자신의 프로젝트만 수정할 수 있습니다."
  on public.projects for update
  using (auth.uid() = author_id);

create policy "자신의 프로젝트만 삭제할 수 있습니다."
  on public.projects for delete
  using (auth.uid() = author_id);


-- 3. 리뷰 (Reviews) 테이블 생성
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz default now() not null
);

-- 리뷰 테이블 RLS 활성화 및 정책
alter table public.reviews enable row level security;

create policy "프로젝트 조회 권한이 있는 사용자만 리뷰를 볼 수 있습니다."
  on public.reviews for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = reviews.project_id
      and (projects.visibility = 'public' or projects.author_id = auth.uid())
    )
  );

create policy "로그인한 사용자는 리뷰를 작성할 수 있습니다."
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "자신의 리뷰만 수정할 수 있습니다."
  on public.reviews for update
  using (auth.uid() = user_id);

create policy "자신의 리뷰만 삭제할 수 있습니다."
  on public.reviews for delete
  using (auth.uid() = user_id);
