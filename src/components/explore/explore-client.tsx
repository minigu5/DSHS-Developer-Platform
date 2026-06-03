"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search, Filter, Globe, ChevronLeft, Terminal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const PLATFORMS = ["web", "ios", "android", "macos", "windows", "linux"];
const TYPES = ["website", "app", "extension", "cli", "library"];

interface ExploreClientProps {
  initialProjects: any[];
}

export function ExploreClient({ initialProjects }: ExploreClientProps) {
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
    return initialProjects.filter(project => {
      const title = project.title || "";
      const shortDesc = project.short_description || "";
      const tags = project.features || [];
      const platforms = project.platforms || [];
      const type = project.type;

      const matchesSearch = 
        title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPlatform = selectedPlatforms.length === 0 || 
        selectedPlatforms.some(platform => platforms.includes(platform));
        
      const matchesType = selectedTypes.length === 0 || 
        selectedTypes.includes(type);
        
      return matchesSearch && matchesPlatform && matchesType;
    });
  }, [searchQuery, selectedPlatforms, selectedTypes, initialProjects]);

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
              {filteredProjects.map((project) => {
                const authorName = project.author_role === 'team' ? project.team_name : project.users?.full_name || '알 수 없음';
                const tags = project.features?.slice(0, 2) || [];

                return (
                  <Link href={`/projects/${project.id}`} key={project.id} className="block">
                    <Card className="group h-full rounded-3xl overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 cursor-pointer">
                      <div className="h-48 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 opacity-50" />
                        {project.icon_url ? (
                          <img src={project.icon_url} alt={project.title} className="w-16 h-16 relative z-10 group-hover:scale-110 transition-transform duration-500 rounded-2xl shadow-md" />
                        ) : (
                          <Terminal className="w-16 h-16 text-zinc-300 dark:text-zinc-700 relative z-10 group-hover:scale-110 transition-transform duration-500" />
                        )}
                        <div className="absolute top-4 right-4 flex gap-2 z-10">
                          <Badge variant="secondary" className="bg-white/80 dark:bg-black/50 backdrop-blur-md">
                            {project.type}
                          </Badge>
                        </div>
                      </div>
                      <CardHeader className="pt-6">
                        <div className="flex gap-2 mb-3 flex-wrap">
                          {tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 rounded-full px-2">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {project.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mt-2">
                          {project.short_description || "설명이 없습니다."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-500 mt-2">
                          <span className="flex items-center">
                            <Globe className="w-3.5 h-3.5 mr-1" />
                            {project.platforms?.join(", ") || '전체'}
                          </span>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-zinc-100 dark:border-zinc-800/50 pt-4 pb-5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                            {authorName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{authorName}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
