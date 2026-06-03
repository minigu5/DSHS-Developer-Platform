"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Info, UploadCloud, Lock, Globe, Code2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PROJECT_TYPES, 
  PLATFORMS, 
  SOURCE_TYPES, 
  LICENSES, 
  FEATURES, 
  VISIBILITY 
} from "@/lib/constants";

export default function NewProjectPage() {
  const [sourceType, setSourceType] = useState<string>("closed");
  const [visibility, setVisibility] = useState<string>("public");
  
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-1" /> 뒤로 가기
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-zinc-500 hidden sm:block">
              새 프로젝트 등록
            </div>
            <AuthButtons />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">프로젝트 등록하기</h1>
          <p className="text-zinc-500 dark:text-zinc-400">당신이 만든 훌륭한 소프트웨어를 대곽 학우들과 공유하세요.</p>
        </div>

        <form className="space-y-8">
          {/* 기본 정보 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">기본 정보</CardTitle>
              <CardDescription>프로젝트를 잘 나타낼 수 있는 이름과 한 줄 설명을 입력해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">프로젝트 이름 <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="예: 대곽 유틸리티 허브" className="h-11 rounded-xl" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">프로젝트 설명 <span className="text-red-500">*</span></Label>
                <Textarea id="description" placeholder="프로젝트가 어떤 문제를 해결하는지 간단하게 적어주세요." className="min-h-[120px] rounded-xl resize-none" />
              </div>
            </CardContent>
          </Card>

          {/* 분류 및 기능 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">분류 및 기능</CardTitle>
              <CardDescription>어떤 종류의 프로젝트이며, 어떤 기능들을 제공하나요?</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              <div className="space-y-3">
                <Label htmlFor="type" className="text-sm font-medium">프로그램 종류 <span className="text-red-500">*</span></Label>
                <Select>
                  <SelectTrigger id="type" className="h-11 rounded-xl">
                    <SelectValue placeholder="프로그램 종류를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">주요 기능 / 카테고리 (다중 선택)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {FEATURES.map(feature => (
                    <div key={feature.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                      <Checkbox id={`feature-${feature.value}`} />
                      <Label htmlFor={`feature-${feature.value}`} className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {feature.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* 플랫폼 및 라이선스 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">환경 및 소스코드</CardTitle>
              <CardDescription>어디서 실행되며 소스코드는 어떻게 관리되나요?</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              <div className="space-y-4">
                <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">지원 플랫폼 (다중 선택)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.map(platform => (
                    <div key={platform.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                      <Checkbox id={`platform-${platform.value}`} />
                      <Label htmlFor={`platform-${platform.value}`} className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {platform.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">소스코드 공개 여부</Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  {SOURCE_TYPES.map(type => (
                    <div 
                      key={type.value}
                      onClick={() => setSourceType(type.value)}
                      className={cn(
                        "flex flex-col items-start p-4 rounded-xl border-2 cursor-pointer transition-all",
                        sourceType === type.value 
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {type.value === 'open' ? <Code2 className={cn("w-5 h-5", sourceType === type.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} /> : <Lock className={cn("w-5 h-5", sourceType === type.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />}
                        <h4 className={cn("font-semibold", sourceType === type.value ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>{type.label}</h4>
                      </div>
                      <p className={cn("text-xs", sourceType === type.value ? "text-blue-700 dark:text-blue-400" : "text-zinc-500")}>
                        {type.value === 'open' ? "누구나 코드를 볼 수 있습니다." : "소스코드를 비공개로 유지합니다."}
                      </p>
                    </div>
                  ))}
                </div>

                {sourceType === 'open' && (
                  <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="repo_url" className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2 block">
                      GitHub Repository URL <span className="text-red-500">*</span>
                    </Label>
                    <Input id="repo_url" placeholder="https://github.com/username/repo" className="h-11 bg-white dark:bg-black rounded-lg border-blue-200 dark:border-blue-800/50 focus-visible:ring-blue-500" />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Label htmlFor="license" className="text-sm font-medium">라이선스 (License)</Label>
                <Select>
                  <SelectTrigger id="license" className="h-11 rounded-xl">
                    <SelectValue placeholder="라이선스를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSES.map(license => (
                      <SelectItem key={license.value} value={license.value}>{license.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">코드 사용 및 배포 권한을 결정합니다. 잘 모르겠다면 '라이선스 없음 / 미정'을 선택하세요.</p>
              </div>

            </CardContent>
          </Card>

          {/* 접근 및 권한 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">접근 권한 설정</CardTitle>
              <CardDescription>누가 이 프로젝트를 열람할 수 있는지 설정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="grid sm:grid-cols-2 gap-4">
                {VISIBILITY.map(v => (
                  <div 
                    key={v.value}
                    onClick={() => setVisibility(v.value)}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border-2 cursor-pointer transition-all",
                      visibility === v.value 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {v.value === 'public' ? <Globe className={cn("w-5 h-5", visibility === v.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} /> : <Lock className={cn("w-5 h-5", visibility === v.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />}
                      <h4 className={cn("font-semibold", visibility === v.value ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>{v.label}</h4>
                    </div>
                    <p className={cn("text-xs", visibility === v.value ? "text-blue-700 dark:text-blue-400" : "text-zinc-500")}>
                      {v.value === 'public' ? "누구나 이 프로젝트를 볼 수 있습니다." : "나와 허락된 사용자만 볼 수 있습니다."}
                    </p>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-4 pt-4 pb-20">
            <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-8 text-base h-12")}>
              취소
            </Link>
            <button type="button" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 text-base bg-blue-600 hover:bg-blue-700 text-white h-12 flex items-center shadow-lg shadow-blue-500/20")}>
              <UploadCloud className="w-5 h-5 mr-2" />
              프로젝트 게시하기
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
