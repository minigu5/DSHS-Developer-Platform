import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Mail, GitBranch, Camera, MessageSquare, Globe } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard, type ProjectCardData } from "@/components/projects/project-card";
import { ProfileSettingsDialog } from "./profile-settings-dialog";
import { isExternalImage } from "@/lib/utils";
import type { UserContact } from "@/lib/types";

const CONTACT_ICONS: Record<UserContact['type'], React.ElementType> = {
  github: GitBranch,
  email: Mail,
  instagram: Camera,
  discord: MessageSquare,
  website: Globe,
};

const CONTACT_LABELS: Record<UserContact['type'], string> = {
  github: 'GitHub',
  email: '이메일',
  instagram: '인스타그램',
  discord: '디스코드',
  website: '웹사이트',
};

function contactHref(contact: UserContact): string {
  if (contact.type === 'email') return `mailto:${contact.value}`;
  if (contact.type === 'github') return `https://github.com/${contact.value}`;
  if (contact.type === 'instagram') return `https://instagram.com/${contact.value}`;
  if (contact.value.startsWith('http')) return contact.value;
  return contact.value;
}

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
      visibility,
      users (*),
      reviews(rating)
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
  const contacts = (developer.contacts as UserContact[]) || [];

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 프로필 사이드바 */}
          <aside className="w-full md:w-80 shrink-0">
            <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden sticky top-24">
              <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-zinc-100 dark:ring-zinc-900">
                  {avatarUrl ? (
                    <Image 
                      src={avatarUrl} 
                      alt="" 
                      fill 
                      className="object-cover" 
                      unoptimized={isExternalImage(avatarUrl)}
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200 flex items-center justify-center text-4xl font-bold" aria-hidden>
                      {initials}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center">
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">{displayName}</h1>
                  
                  {nickname ? (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mb-4 border border-zinc-200 dark:border-zinc-700/50">
                      {actualFullName}
                    </div>
                  ) : (
                    <p className="font-medium text-zinc-500 dark:text-zinc-400 mb-4 text-xs">
                      학생 개발자
                    </p>
                  )}
                </div>
                
                {bio && (
                  <div className="w-full mb-6">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 px-2 leading-relaxed break-keep">
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
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="w-full space-y-3 text-sm text-left mt-2">
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <Mail className="w-4 h-4 mr-3 shrink-0 text-zinc-500" aria-label="이메일" />
                    <span className="truncate">{developer.email}</span>
                  </div>
                  {contacts.filter((c) => c.value.trim() !== "").map((contact, idx) => {
                    const Icon = CONTACT_ICONS[contact.type] ?? Globe;
                    const href = contactHref(contact);
                    const isExternal = href.startsWith('http') || href.startsWith('mailto');
                    return (
                      <div key={idx} className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                        <Icon className="w-4 h-4 shrink-0 text-zinc-500" aria-hidden />
                        {isExternal ? (
                          <Link
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate underline-offset-4 hover:text-blue-700 hover:underline dark:hover:text-blue-400"
                          >
                            {contact.value}
                          </Link>
                        ) : (
                          <span className="truncate">{contact.value}</span>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <CalendarDays className="w-4 h-4 mr-3 shrink-0 text-zinc-500" aria-hidden />
                    가입일: {joinedDate}
                  </div>
                </div>

                {isOwner && (
                  <div className="w-full mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <ProfileSettingsDialog
                      userId={developer.id}
                      initialNickname={nickname}
                      initialBio={bio}
                      initialAvatar={avatarUrl}
                      initialInterests={interests}
                      initialContacts={contacts}
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
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{isOwner ? "내 프로젝트" : "등록한 프로젝트"}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {isOwner ? "내가 등록했거나 팀원으로 참여한 프로젝트예요." : `${displayName}님이 참여한 프로젝트예요.`}
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
              <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-700">
                <p className="text-zinc-600 dark:text-zinc-400">{isOwner ? "아직 등록한 프로젝트가 없어요." : "공개된 프로젝트가 없어요."}</p>
                {isOwner && (
                  <Link
                    href="/projects/new"
                    className="mt-3 inline-block text-sm font-medium text-blue-700 dark:text-blue-400 underline underline-offset-4"
                  >
                    프로젝트 등록하기
                  </Link>
                )}
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
