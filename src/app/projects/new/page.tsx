"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Info, UploadCloud, Lock, Globe, Code2, Users, User as UserIcon, Plus, X, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthButtons } from "@/components/shared/auth-buttons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  LICENSE_FEATURES, 
  FEATURES, 
  VISIBILITY 
} from "@/lib/constants";

export default function NewProjectPage() {
  const [type, setType] = useState<string>("");
  const [sourceType, setSourceType] = useState<string>("closed");
  const [visibility, setVisibility] = useState<string>("public");
  
  // 설명 길이
  const [shortDesc, setShortDesc] = useState("");
  
  // 작성자 정보
  const [authorRole, setAuthorRole] = useState<"individual" | "team">("individual");
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [currentMember, setCurrentMember] = useState("");

  // 아이콘
  const [iconType, setIconType] = useState<"auto" | "upload">("auto");
  const [url, setUrl] = useState("");

  // 라이선스 기타
  const [hasCustomLicense, setHasCustomLicense] = useState(false);

  const addTeamMember = () => {
    if (currentMember.trim() && !teamMembers.includes(currentMember.trim())) {
      setTeamMembers([...teamMembers, currentMember.trim()]);
      setCurrentMember("");
    }
  };

  const removeTeamMember = (member: string) => {
    setTeamMembers(teamMembers.filter(m => m !== member));
  };

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
          
          {/* 작성자 정보 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">개발자 정보</CardTitle>
              <CardDescription>개인 프로젝트인지 팀 프로젝트인지 선택해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => setAuthorRole("individual")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                    authorRole === "individual" 
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <UserIcon className={cn("w-6 h-6 mb-2", authorRole === "individual" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                  <h4 className={cn("font-semibold", authorRole === "individual" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>개인</h4>
                </div>
                <div 
                  onClick={() => setAuthorRole("team")}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all",
                    authorRole === "team" 
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <Users className={cn("w-6 h-6 mb-2", authorRole === "team" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                  <h4 className={cn("font-semibold", authorRole === "team" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>팀</h4>
                </div>
              </div>

              {authorRole === "team" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="team_name" className="text-sm font-medium">팀 이름</Label>
                    <Input id="team_name" placeholder="팀 이름을 입력하세요" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">팀원 (작성자는 자동으로 포함됩니다)</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={currentMember}
                        onChange={(e) => setCurrentMember(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeamMember(); } }}
                        placeholder="팀원 이름 입력 후 추가 버튼 또는 엔터" 
                        className="h-11 rounded-xl flex-1" 
                      />
                      <button 
                        type="button" 
                        onClick={addTeamMember}
                        className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {teamMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {teamMembers.map(member => (
                          <div key={member} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {member}
                            <button type="button" onClick={() => removeTeamMember(member)} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 기본 정보 */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xl">기본 정보</CardTitle>
              <CardDescription>프로젝트를 잘 나타낼 수 있는 이름과 설명을 작성해주세요.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-3">
                <Label className="text-sm font-medium">아이콘 설정 <span className="text-red-500">*</span></Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setIconType("auto")}
                    className={cn(
                      "flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                      iconType === "auto" 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                    )}
                  >
                    <Globe className={cn("w-5 h-5 mr-3", iconType === "auto" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                    <div>
                      <h4 className={cn("font-medium text-sm", iconType === "auto" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>웹사이트에서 가져오기</h4>
                      <p className="text-xs text-zinc-500">입력된 URL의 파비콘 사용</p>
                    </div>
                  </div>
                  <div 
                    onClick={() => setIconType("upload")}
                    className={cn(
                      "flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all",
                      iconType === "upload" 
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                    )}
                  >
                    <ImageIcon className={cn("w-5 h-5 mr-3", iconType === "upload" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                    <div>
                      <h4 className={cn("font-medium text-sm", iconType === "upload" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>직접 업로드</h4>
                      <p className="text-xs text-zinc-500">정사각형 이미지 권장</p>
                    </div>
                  </div>
                </div>
                {iconType === "upload" && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                    <Input type="file" accept="image/*" className="h-11 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">프로젝트 이름 <span className="text-red-500">*</span></Label>
                <Input id="title" placeholder="예: 대곽 유틸리티 허브" className="h-11 rounded-xl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-medium">웹사이트 또는 다운로드 링크 <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input 
                    id="url" 
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..." 
                    className="h-11 rounded-xl pl-9" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label htmlFor="short_description" className="text-sm font-medium">간단 설명 <span className="text-red-500">*</span></Label>
                  <span className={cn("text-xs", shortDesc.length > 100 ? "text-red-500 font-bold" : "text-zinc-500")}>
                    {shortDesc.length} / 100
                  </span>
                </div>
                <Textarea 
                  id="short_description" 
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="탐색 페이지의 작은 카드에 표시될 한 줄 설명을 입력해주세요." 
                  className={cn("min-h-[80px] rounded-xl resize-none", shortDesc.length > 100 && "border-red-500 focus-visible:ring-red-500")} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">상세 설명 <span className="text-red-500">*</span></Label>
                <Textarea id="description" placeholder="상세 페이지에서 보여질 프로젝트의 자세한 기능, 개발 배경, 사용 기술 등을 자유롭게 작성해주세요." className="min-h-[200px] rounded-xl resize-none" />
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
                <Select value={type} onValueChange={(val) => setType(val || "")}>
                  <SelectTrigger id="type" className="h-11 rounded-xl">
                    <SelectValue placeholder="프로그램 종류를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
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
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">지원 플랫폼</Label>
                  {type !== 'app' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full font-medium">자동으로 모든 플랫폼이 선택됩니다</span>
                  )}
                </div>
                
                {type === 'app' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                    {PLATFORMS.map(platform => (
                      <div key={platform.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                        <Checkbox id={`platform-${platform.value}`} />
                        <Label htmlFor={`platform-${platform.value}`} className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {platform.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {PLATFORMS.map(platform => (
                      <div key={platform.value} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-medium rounded-lg">
                        {platform.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">소스코드 공개 여부</Label>
                <div className="grid sm:grid-cols-2 gap-4">
                  {SOURCE_TYPES.map(stype => (
                    <div 
                      key={stype.value}
                      onClick={() => setSourceType(stype.value)}
                      className={cn(
                        "flex flex-col items-start p-4 rounded-xl border-2 cursor-pointer transition-all",
                        sourceType === stype.value 
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20" 
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {stype.value === 'open' ? <Code2 className={cn("w-5 h-5", sourceType === stype.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} /> : <Lock className={cn("w-5 h-5", sourceType === stype.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />}
                        <h4 className={cn("font-semibold", sourceType === stype.value ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>{stype.label}</h4>
                      </div>
                      <p className={cn("text-xs", sourceType === stype.value ? "text-blue-700 dark:text-blue-400" : "text-zinc-500")}>
                        {stype.value === 'open' ? "누구나 코드를 볼 수 있습니다." : "소스코드를 비공개로 유지합니다."}
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

              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Label className="text-sm font-medium">라이선스 (허용 및 보장 항목)</Label>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">이 프로그램 및 소스코드에 대한 사용 권한을 직관적으로 선택해주세요. 다중 선택이 가능합니다.</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {LICENSE_FEATURES.map(lf => (
                    <div key={lf.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                      <Checkbox id={`lf-${lf.value}`} />
                      <Label htmlFor={`lf-${lf.value}`} className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lf.label}
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                    <Checkbox id="lf-custom" checked={hasCustomLicense} onCheckedChange={(checked) => setHasCustomLicense(!!checked)} />
                    <Label htmlFor="lf-custom" className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      기타 (직접 입력)
                    </Label>
                  </div>
                </div>

                {hasCustomLicense && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <Input placeholder="기타 라이선스 조건 입력" className="h-11 rounded-xl" />
                  </div>
                )}
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
            <button type="button" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 text-base bg-blue-600 hover:bg-blue-700 text-white h-12 flex items-center shadow-lg shadow-blue-500/20", shortDesc.length > 100 && "opacity-50 cursor-not-allowed")} disabled={shortDesc.length > 100}>
              <UploadCloud className="w-5 h-5 mr-2" />
              프로젝트 게시하기
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
