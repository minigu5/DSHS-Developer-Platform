import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Settings, MapPin, Mail, CalendarDays } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { AuthButtons } from '@/components/shared/auth-buttons';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectCard, type ProjectCardData } from '@/components/projects/project-card';

export const metadata = {
  title: '내 프로필 — DSHS Developer Platform',
};

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/me');
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = fullName.substring(0, 2).toUpperCase();
  const joinedDate = new Date(user.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const { data: myProjects } = await supabase
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
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .returns<ProjectCardData[]>();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-1" /> 홈으로
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg hidden sm:block">내 프로필</h1>
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 프로필 사이드바 */}
          <aside className="w-full md:w-80 shrink-0">
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden sticky top-24">
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-6 ring-4 ring-zinc-100 dark:ring-zinc-900 shadow-xl">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={fullName} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center text-4xl font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">{fullName}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">학생 개발자</p>
                
                <div className="w-full space-y-4 text-sm text-left">
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <Mail className="w-4 h-4 mr-3 text-zinc-400" />
                    {user.email}
                  </div>
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <CalendarDays className="w-4 h-4 mr-3 text-zinc-400" />
                    가입일: {joinedDate}
                  </div>
                  <div className="flex items-center text-zinc-600 dark:text-zinc-300">
                    <MapPin className="w-4 h-4 mr-3 text-zinc-400" />
                    대구과학고등학교
                  </div>
                </div>

                <div className="w-full mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                  <button className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center">
                    <Settings className="w-4 h-4 mr-2" />
                    프로필 설정 (준비 중)
                  </button>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* 메인 콘텐츠 영역 (프로젝트 목록) */}
          <div className="flex-1 min-w-0">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">내 프로젝트</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">내가 등록하고 관리하는 프로젝트 목록입니다.</p>
              </div>
            </div>

            {myProjects && myProjects.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {myProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    mode="manage"
                    authorFallback={fullName}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <p className="text-zinc-500 dark:text-zinc-400 mb-4">아직 등록한 프로젝트가 없습니다.</p>
                <Link href="/projects/new" className={cn(buttonVariants(), "rounded-full")}>
                  새 프로젝트 등록하기
                </Link>
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
