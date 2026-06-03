"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Lock, Globe, Code2, Users, User as UserIcon, Plus, X, Image as ImageIcon, Link as LinkIcon, Loader2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  VISIBILITY,
  isAllowedEmail
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow } from "@/lib/types";

type Visibility = 'public' | 'private';
type SourceType = 'open' | 'closed';
type AuthorRole = 'individual' | 'team';
type IconType = 'auto' | 'upload';

interface ProjectFormProps {
  initialData?: ProjectRow;
  isEdit?: boolean;
}

export function ProjectForm({ initialData, isEdit = false }: ProjectFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [title, setTitle] = useState<string>(initialData?.title ?? "");
  const [type, setType] = useState<string>(initialData?.type ?? "");
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialData?.source_type as SourceType) ?? "closed",
  );
  const [visibility, setVisibility] = useState<Visibility>(
    initialData?.visibility ?? "public",
  );
  
  // 설명
  const [shortDesc, setShortDesc] = useState<string>(initialData?.short_description ?? "");
  const [description, setDescription] = useState<string>(initialData?.description ?? "");

  // 작성자 정보
  const [authorRole, setAuthorRole] = useState<AuthorRole>(
    initialData?.author_role ?? "individual",
  );
  const [teamName, setTeamName] = useState<string>(initialData?.team_name ?? "");
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team_members ?? []);
  const [currentMember, setCurrentMember] = useState("");
  const [memberError, setMemberError] = useState("");

  // 허용 사용자 (비공개)
  const [allowedUsers, setAllowedUsers] = useState<string[]>(initialData?.allowed_users ?? []);
  const [currentUser, setCurrentUser] = useState("");
  const [userError, setUserError] = useState("");

  // 플랫폼 & 기능
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialData?.platforms ?? []);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureCustom, setFeatureCustom] = useState<string>(initialData?.feature_custom ?? "");

  // 아이콘
  const [iconType, setIconType] = useState<IconType>(initialData?.icon_type ?? "auto");
  const [url, setUrl] = useState<string>(initialData?.url ?? "");
  const [repoUrl, setRepoUrl] = useState<string>(initialData?.repo_url ?? "");

  // 라이선스
  const [licenseFeatures, setLicenseFeatures] = useState<string[]>(initialData?.license_features ?? []);
  const [hasCustomLicense, setHasCustomLicense] = useState(!!initialData?.license_custom);
  const [licenseCustom, setLicenseCustom] = useState<string>(initialData?.license_custom ?? "");

  const addTeamMember = () => {
    const email = currentMember.trim();
    if (!email) return;
    if (!isAllowedEmail(email)) {
      setMemberError("@ts.hs.kr 이메일 주소만 입력 가능합니다.");
      return;
    }
    if (!teamMembers.includes(email)) {
      setTeamMembers([...teamMembers, email]);
      setCurrentMember("");
      setMemberError("");
    }
  };

  const removeTeamMember = (member: string) => {
    setTeamMembers(teamMembers.filter(m => m !== member));
  };

  const addAllowedUser = () => {
    const email = currentUser.trim();
    if (!email) return;
    if (!isAllowedEmail(email)) {
      setUserError("@ts.hs.kr 이메일 주소만 입력 가능합니다.");
      return;
    }
    if (!allowedUsers.includes(email)) {
      setAllowedUsers([...allowedUsers, email]);
      setCurrentUser("");
      setUserError("");
    }
  };

  const removeAllowedUser = (user: string) => {
    setAllowedUsers(allowedUsers.filter(u => u !== user));
  };

  const handlePlatformChange = (val: string, checked: boolean) => {
    setSelectedPlatforms(prev => checked ? [...prev, val] : prev.filter(p => p !== val));
  };

  const handleFeatureChange = (val: string, checked: boolean) => {
    setSelectedFeatures(prev => checked ? [...prev, val] : prev.filter(p => p !== val));
  };

  const handleLicenseFeatureChange = (val: string, checked: boolean) => {
    setLicenseFeatures(prev => checked ? [...prev, val] : prev.filter(p => p !== val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    // 유효성 검사
    if (!title || !shortDesc || !description || !type || !url) {
      setErrorMsg("필수 입력 항목을 모두 채워주세요.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (shortDesc.length > 100) {
      setErrorMsg("간단 설명은 100자 이내여야 합니다.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (sourceType === 'open' && !repoUrl) {
      setErrorMsg("오픈소스인 경우 GitHub Repository URL이 필수입니다.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("로그인이 필요합니다.");
      }

      // 플랫폼 로직: 앱이 아니면 모든 플랫폼
      let platformsToSave = selectedPlatforms;
      if (type !== 'app') {
        platformsToSave = PLATFORMS.map(p => p.value);
      }

      const payload = {
        author_id: session.user.id,
        title,
        short_description: shortDesc,
        description,
        type,
        platforms: platformsToSave,
        source_type: sourceType,
        repo_url: sourceType === 'open' ? repoUrl : null,
        license_features: licenseFeatures,
        license_custom: hasCustomLicense ? licenseCustom : null,
        features: selectedFeatures,
        feature_custom: selectedFeatures.includes('other') ? featureCustom : null,
        visibility,
        allowed_users: visibility === 'private' ? allowedUsers : [],
        author_role: authorRole,
        team_name: authorRole === 'team' ? teamName : null,
        team_members: authorRole === 'team' ? teamMembers : [],
        url,
        icon_type: iconType,
        icon_url: iconType === 'auto' && url ? `https://www.google.com/s2/favicons?domain=${url}&sz=128` : null, // 간단한 auto 아이콘 로직
        updated_at: new Date().toISOString()
      };

      if (isEdit && initialData?.id) {
        const { error } = await supabase.from('projects').update(payload).eq('id', initialData.id);
        if (error) throw error;
        router.push(`/projects/${initialData.id}`);
      } else {
        const { data, error } = await supabase.from('projects').insert([payload]).select().single();
        if (error) throw error;
        router.push(`/projects/${data.id}`);
      }
      
      router.refresh();
    } catch (err) {
      console.error('[ProjectForm] submit error:', err);
      let msg = '오류가 발생했습니다. 다시 시도해주세요.';
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object') {
        const e = err as { message?: string; details?: string; hint?: string; code?: string };
        msg = [e.message, e.details, e.hint, e.code && `(code: ${e.code})`].filter(Boolean).join(' / ') || msg;
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800 text-sm font-medium">
          {errorMsg}
        </div>
      )}

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
                <Input id="team_name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="팀 이름을 입력하세요" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">팀원 이메일 (@ts.hs.kr)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={currentMember}
                    onChange={(e) => { setCurrentMember(e.target.value); setMemberError(""); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTeamMember(); } }}
                    placeholder="팀원 학교 이메일 입력 후 추가 버튼 또는 엔터" 
                    className={cn("h-11 rounded-xl flex-1", memberError && "border-red-500 focus-visible:ring-red-500")} 
                  />
                  <button 
                    type="button" 
                    onClick={addTeamMember}
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {memberError && <p className="text-xs text-red-500 mt-1">{memberError}</p>}
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
                  <p className="text-xs text-zinc-500">입력된 URL의 파비콘 자동 추출</p>
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
                  <h4 className={cn("font-medium text-sm", iconType === "upload" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>기본 아이콘</h4>
                  <p className="text-xs text-zinc-500">타이틀 앞글자 표시</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">프로젝트 이름 <span className="text-red-500">*</span></Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 대곽 유틸리티 허브" className="h-11 rounded-xl" />
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
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="상세 페이지에서 보여질 프로젝트의 자세한 기능, 개발 배경, 사용 기술 등을 자유롭게 작성해주세요." className="min-h-[200px] rounded-xl resize-none" />
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
                  <Checkbox 
                    id={`feature-${feature.value}`} 
                    checked={selectedFeatures.includes(feature.value)}
                    onCheckedChange={(checked) => handleFeatureChange(feature.value, checked as boolean)}
                  />
                  <Label htmlFor={`feature-${feature.value}`} className="cursor-pointer text-sm font-medium w-full text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>
            
            {/* 기타 커스텀 입력창 */}
            {selectedFeatures.includes('other') && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                <Input 
                  placeholder="기타 기능/카테고리를 직접 입력해주세요" 
                  value={featureCustom}
                  onChange={e => setFeatureCustom(e.target.value)}
                  className="h-11 rounded-xl" 
                />
              </div>
            )}
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
                <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full font-medium">
                  {type === 'website' ? '웹사이트는 모든 플랫폼에서 지원합니다.' : '자동으로 모든 플랫폼이 선택됩니다'}
                </span>
              )}
            </div>
            
            {type === 'app' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
                {PLATFORMS.map(platform => (
                  <div key={platform.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                    <Checkbox 
                      id={`platform-${platform.value}`} 
                      checked={selectedPlatforms.includes(platform.value)}
                      onCheckedChange={(checked) => handlePlatformChange(platform.value, checked as boolean)}
                    />
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
                  onClick={() => setSourceType(stype.value as SourceType)}
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
                <Input id="repo_url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/username/repo" className="h-11 bg-white dark:bg-black rounded-lg border-blue-200 dark:border-blue-800/50 focus-visible:ring-blue-500" />
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Label className="text-sm font-medium">라이선스 (허용 및 보장 항목)</Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">이 프로그램 및 소스코드에 대한 사용 권한을 직관적으로 선택해주세요. 다중 선택이 가능합니다.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LICENSE_FEATURES.map(lf => (
                <div key={lf.value} className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3 rounded-xl hover:border-blue-500 transition-colors cursor-pointer group">
                  <Checkbox 
                    id={`lf-${lf.value}`} 
                    checked={licenseFeatures.includes(lf.value)}
                    onCheckedChange={(checked) => handleLicenseFeatureChange(lf.value, checked as boolean)}
                  />
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
                <Input value={licenseCustom} onChange={e => setLicenseCustom(e.target.value)} placeholder="기타 라이선스 조건 입력" className="h-11 rounded-xl" />
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
                onClick={() => setVisibility(v.value as Visibility)}
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

          {visibility === "private" && (
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">열람을 허용할 사용자 이메일 (@ts.hs.kr)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={currentUser}
                    onChange={(e) => { setCurrentUser(e.target.value); setUserError(""); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAllowedUser(); } }}
                    placeholder="이메일 입력 후 추가 버튼 또는 엔터" 
                    className={cn("h-11 rounded-xl flex-1", userError && "border-red-500 focus-visible:ring-red-500")} 
                  />
                  <button 
                    type="button" 
                    onClick={addAllowedUser}
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {userError && <p className="text-xs text-red-500 mt-1">{userError}</p>}
                {allowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allowedUsers.map(user => (
                      <div key={user} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {user}
                        <button type="button" onClick={() => removeAllowedUser(user)} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5">
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
      
      <div className="flex justify-end gap-4 pt-4 pb-20">
        <button type="button" onClick={() => router.back()} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "rounded-full px-8 text-base h-12")}>
          취소
        </button>
        <button 
          type="submit" 
          disabled={isLoading || shortDesc.length > 100}
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-8 text-base bg-blue-600 hover:bg-blue-700 text-white h-12 flex items-center shadow-lg shadow-blue-500/20", (isLoading || shortDesc.length > 100) && "opacity-50 cursor-not-allowed")} 
        >
          {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UploadCloud className="w-5 h-5 mr-2" />}
          {isEdit ? "프로젝트 수정하기" : "프로젝트 게시하기"}
        </button>
      </div>
    </form>
  );
}
