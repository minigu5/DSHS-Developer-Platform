import { notFound } from "next/navigation";
import Image from "next/image";
import { CalendarDays, Mail } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { ProfileSettingsDialog } from "./profile-settings-dialog";
import { isExternalImage } from "@/lib/utils";

export default async function DeveloperProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwner = currentUser?.id === id;

  // Fetch the developer user info
  const { data: developer, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (userError || !developer) {
    notFound();
  }

  // Fetch their projects (RLS applies)
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
    .eq('author_id', id)
    .order('created_at', { ascending: false })
    .returns<ProjectCardData[]>();

  const avatarUrl = developer.avatar_url ?? "";
  const nickname = developer.nickname ?? "";
  const bio = developer.bio ?? "";
  const actualFullName = developer.full_name || developer.email?.split("@")[0] || "User";
  const displayName = nickname || actualFullName;
  const initials = displayName.substring(0, 2).toUpperCase();
  const joinedDate = new Date(developer.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const interests = (developer.interests as string[]) || [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 프로필 사이드바 */}
          <aside className="w-full md:w-80 shrink-0">
            <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden sticky top-24">
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-zinc-100 dark:ring-zinc-900 shadow-xl">
                  {avatarUrl ? (
                    <Image 
                      src={avatarUrl} 
                      alt={actualFullName} 
                      fill 
                      className="object-cover" 
                      unoptimized={isExternalImage(avatarUrl)}
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">{displayName}</h2>
                  
                  {nickname ? (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mb-4 border border-zinc-200/50 dark:border-zinc-700/50">
                      {actualFullName}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider text-[10px]">
                      학생 개발자
                    </p>
                  )}
                </div>
                
                {bio && (
                  <div className="relative w-full mb-6">
                    <div className="absolute -left-1 top-0 bottom-0 w-1 bg-blue-500/20 rounded-full" />
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 px-4 leading-relaxed">
                      {bio}
                    </p>
                  </div>
                )}

                {interests.length > 0 && (
                  <div className="w-full flex flex-wrap gap-1.5 justify-center mb-6">
                    {interests.map((value) => {
                      const label = INTERESTS.find(i => i.value === value)?.label || value;
                      return (
                        <div 
                          key={value}
                          className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-100 dark:border-blue-800/50"
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="w-full space-y-4 text-sm text-left mt-2">
                  {isOwner && (
                    <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                      <Mail className="w-4 h-4 mr-3 text-zinc-400" />
                      {developer.email}
                    </div>
                  )}
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <CalendarDays className="w-4 h-4 mr-3 text-zinc-400" />
                    가입일: {joinedDate}
                  </div>
                </div>

                {isOwner && (
                  <div className="w-full mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                    <ProfileSettingsDialog 
                      userId={developer.id}
                      initialNickname={nickname} 
                      initialBio={bio} 
                      initialAvatar={avatarUrl} 
                      initialInterests={interests}
                      fullName={actualFullName}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          {/* 메인 콘텐츠 영역 (프로젝트 목록) */}
          <div className="flex-1 min-w-0">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{isOwner ? "내 프로젝트" : "등록한 프로젝트"}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {isOwner ? "내가 등록하고 관리하는 프로젝트 목록입니다." : `${displayName}님이 참여한 프로젝트 목록입니다.`}
                </p>
              </div>
            </div>

            {projects && projects.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    mode={isOwner ? "manage" : "showcase"}
                    authorFallback={displayName}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
                <p className="text-zinc-500 dark:text-zinc-400">{isOwner ? "아직 등록한 프로젝트가 없습니다." : "등록된 공개 프로젝트가 없습니다."}</p>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
