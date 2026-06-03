"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search, Filter, Globe, ChevronLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const DEMO_PROJECTS = [
  {
    id: "1",
    title: "대곽 유틸리티 허브",
    description: "시간표 관리, 급식 메뉴 확인 등 대곽 학생들을 위한 종합 유틸리티 도구입니다.",
    type: "Web App",
    platforms: ["Web", "iOS", "Android"],
    author: "신민규",
    tags: ["Utility", "Open Source"],
    likes: 124,
  },
  {
    id: "2",
    title: "양자물리 시뮬레이터",
    description: "고급 물리 수업에서 다루는 양자역학 개념들을 3D로 시각화한 인터랙티브 시뮬레이션.",
    type: "Application",
    platforms: ["macOS", "Windows"],
    author: "물리부 팀",
    tags: ["Education", "3D"],
    likes: 89,
  },
  {
    id: "3",
    title: "Chem-AI 어시스턴트",
    description: "화학 반응식을 자동으로 맞춰주고 반응 결과를 예측해주는 AI 기반 학습 도구.",
    type: "AI Tool",
    platforms: ["Web"],
    author: "AI 스터디 그룹",
    tags: ["AI", "Chemistry"],
    likes: 210,
  },
  {
    id: "4",
    title: "DSHS 알고리즘 튜터",
    description: "정보 시간 및 올림피아드 대비를 위한 맞춤형 알고리즘 문제 추천 및 해설 서비스.",
    type: "Web App",
    platforms: ["Web"],
    author: "정보올림피아드 동아리",
    tags: ["Education", "Algorithm"],
    likes: 342,
  },
  {
    id: "5",
    title: "기숙사 룸메 매칭 시스템",
    description: "생활 패턴, 수면 시간 등을 분석하여 최적의 룸메이트를 추천해주는 서비스입니다.",
    type: "Web App",
    platforms: ["Web", "Android"],
    author: "기숙사 자치회",
    tags: ["Utility", "Life"],
    likes: 156,
  }
];

const PLATFORMS = ["Web", "iOS", "Android", "macOS", "Windows"];
const TYPES = ["Web App", "Application", "AI Tool", "Extension"];

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setSelectedPlatforms(prev => 
      checked ? [...prev, platform] : prev.filter(p => p !== platform)
    );
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    setSelectedTypes(prev => 
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  const filteredProjects = useMemo(() => {
    return DEMO_PROJECTS.filter(project => {
      const matchesSearch = 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPlatform = selectedPlatforms.length === 0 || 
        selectedPlatforms.some(platform => project.platforms.includes(platform));
        
      const matchesType = selectedTypes.length === 0 || 
        selectedTypes.includes(project.type);
        
      return matchesSearch && matchesPlatform && matchesType;
    });
  }, [searchQuery, selectedPlatforms, selectedTypes]);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
              <ChevronLeft className="w-4 h-4 mr-1" /> 홈으로
            </Link>
            <h1 className="font-bold text-lg hidden sm:block">DSHS Developer Platform</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/projects/new" className={cn(buttonVariants({ size: "sm" }), "rounded-full bg-blue-600 hover:bg-blue-700 text-white")}>
              프로젝트 등록
            </Link>
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* SIDEBAR / FILTERS */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center">
                <Filter className="w-4 h-4 mr-2" /> 필터
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">플랫폼</h4>
                  <div className="space-y-2">
                    {PLATFORMS.map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`platform-${platform}`} 
                          checked={selectedPlatforms.includes(platform)}
                          onCheckedChange={(checked) => handlePlatformChange(platform, checked as boolean)}
                        />
                        <Label htmlFor={`platform-${platform}`} className="text-sm font-normal cursor-pointer text-zinc-600 dark:text-zinc-400">
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">프로그램 종류</h4>
                  <div className="space-y-2">
                    {TYPES.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`type-${type}`} 
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => handleTypeChange(type, checked as boolean)}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer text-zinc-600 dark:text-zinc-400">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT / SEARCH & GRID */}
        <div className="flex-1 min-w-0">
          <div className="mb-8 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
            <Input 
              placeholder="프로젝트 이름, 설명, 혹은 태그로 검색해보세요..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-base focus-visible:ring-blue-500"
            />
          </div>

          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">모든 프로젝트 <span className="text-zinc-400 text-base font-normal ml-2">({filteredProjects.length})</span></h2>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-zinc-900/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400">조건에 맞는 프로젝트가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="group rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
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
                      {project.description}
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
