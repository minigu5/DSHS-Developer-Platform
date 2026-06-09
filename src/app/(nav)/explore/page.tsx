export const dynamic = 'force-dynamic';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ExploreClient } from "@/components/explore/explore-client";
import { isDeveloper } from "@/lib/constants";
import type { ProjectCardData } from "@/components/projects/project-card";

const PROJECT_SELECT = `
  id,
  title,
  short_description,
  type,
  platforms,
  author_role,
  team_name,
  icon_url,
  features,
  author_id,
  visibility,
  users (*),
  reviews(rating)
`;

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let projects: ProjectCardData[] | null = null;

  if (isDeveloper(user?.email)) {
    // 개발자 계정: 모든 프로젝트(공개+비공개) 조회
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from('projects')
      .select(PROJECT_SELECT)
      .order('created_at', { ascending: false })
      .returns<ProjectCardData[]>();
    projects = data;
  } else {
    // 일반 사용자 / 비로그인: RLS 가 공개 프로젝트 + 허용된 비공개 프로젝트를 자동 필터링
    const { data } = await supabase
      .from('projects')
      .select(PROJECT_SELECT)
      .order('created_at', { ascending: false })
      .returns<ProjectCardData[]>();
    projects = data;
  }

  return <ExploreClient initialProjects={projects ?? []} />;
}
