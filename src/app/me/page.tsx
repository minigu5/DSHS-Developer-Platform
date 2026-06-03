import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Globe, Settings, MapPin, Mail, CalendarDays } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { AuthButtons } from '@/components/shared/auth-buttons';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// 임시 모의 데이터 - 사용자의 프로젝트
const MY_PROJECTS = [
  {
    id: "1",
    title: "대곽 유틸리티 허브",
    short_description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다.",
    description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다. 상세 설명...",
    type: "Web App",
    platforms: ["Web", "iOS", "Android"],
    author: "신민규",
    tags: ["Utility", "Open Source"],
    likes: 124,
  }
];

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {MY_PROJECTS.map((project) => (
                <Link href={`/projects/${project.id}`} key={project.id} className="block">
                  <Card className="group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer">
                    <CardHeader className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                            {project.type}
                          </Badge>
                          {project.tags.slice(0, 1).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full px-2">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-2">
                        {project.short_description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-500 mt-2">
                        <span className="flex items-center">
                          <Globe className="w-3.5 h-3.5 mr-1" />
                          {project.platforms.join(", ")}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                          {project.author.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{project.author}</span>
                      </div>
                      <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-zinc-300 dark:text-zinc-700 mr-1.5 group-hover:text-red-500 transition-colors">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {project.likes}
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
