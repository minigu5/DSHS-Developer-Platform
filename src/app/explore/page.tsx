import { createClient } from "@/lib/supabase/server";
import { ExploreClient } from "@/components/explore/explore-client";

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
      users (full_name)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  return <ExploreClient initialProjects={projects || []} />;
}
