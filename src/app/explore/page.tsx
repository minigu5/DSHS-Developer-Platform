import { createClient } from "@/lib/supabase/server";
import { ExploreClient } from "@/components/explore/explore-client";
import type { ProjectCardData } from "@/components/projects/project-card";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch all public projects
  const { data: projects } = await supabase
    .from('projects')
    .select(`
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
      users (*)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .returns<ProjectCardData[]>();

  return <ExploreClient initialProjects={projects ?? []} />;
}
