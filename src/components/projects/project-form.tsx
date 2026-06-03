"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Lock, Globe, Code2, Users, User as UserIcon, Plus, X, Image as ImageIcon, Link as LinkIcon, Loader2, Upload } from "lucide-react";

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
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(initialData?.icon_url ?? null);
  const [iconError, setIconError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const validateAndSetIcon = (file: File) => {
    setIconError("");
    // 규정: 512*512이하의 정사각형 png, jpeg만 업로드 가능
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setIconError("PNG 또는 JPEG 이미지만 업로드 가능합니다.");
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width !== img.height) {
        setIconError("아이콘은 정사각형(1:1 비율)이어야 합니다.");
        URL.revokeObjectURL(img.src);
        return;
      }
      if (img.width > 512 || img.height > 512) {
        setIconError("아이콘 크기는 최대 512x512까지 허용됩니다.");
        URL.revokeObjectURL(img.src);
        return;
      }
      
      setIconFile(file);
      setIconPreview(img.src);
      setIconError("");
    };
  };

  const handleIconTypeChange = (newType: IconType) => {
    setIconType(newType);
    setIconError("");
    if (newType === 'auto') {
      setIconFile(null);
      setIconPreview(initialData?.icon_url || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const scrollToField = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        const offset = 120; // Header offset
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    };
    
    // 유효성 검사 (순서대로)
    if (authorRole === 'team' && !teamName) {
      setErrorMsg("팀 이름을 입력해주세요.");
      scrollToField("team_name_section");
      return;
    }

    if (iconType === 'upload' && !iconFile && !initialData?.icon_url) {
      setIconError("프로젝트 아이콘을 업로드해주세요.");
      scrollToField("icon_section");
      return;
    }

    if (!title) {
      setErrorMsg("프로젝트 이름을 입력해주세요.");
      scrollToField("title_section");
      return;
    }

    if (!url) {
      setErrorMsg("웹사이트 또는 다운로드 링크를 입력해주세요.");
      scrollToField("url_section");
      return;
    }

    if (!shortDesc) {
      setErrorMsg("간단 설명을 입력해주세요.");
      scrollToField("short_description_section");
      return;
    }

    if (shortDesc.length > 100) {
      setErrorMsg("간단 설명은 100자 이내여야 합니다.");
      scrollToField("short_description_section");
      return;
    }

    if (!description) {
      setErrorMsg("상세 설명을 입력해주세요.");
      scrollToField("description_section");
      return;
    }

    if (!type) {
      setErrorMsg("프로그램 종류를 선택해주세요.");
      scrollToField("type_section");
      return;
    }

    if (type === 'app' && selectedPlatforms.length === 0) {
      setErrorMsg("지원 플랫폼을 최소 하나 이상 선택해주세요.");
      scrollToField("platforms_section");
      return;
    }

    if (sourceType === 'open' && !repoUrl) {
      setErrorMsg("오픈소스인 경우 GitHub Repository URL이 필수입니다.");
      scrollToField("repo_url_section");
      return;
    }
    
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("로그인이 필요합니다.");
      }

      // 플랫폼 로직: 예전에는 앱이 아니면 강제로 전체였으나, 이제 사용자 선택을 존중 (기본값만 세팅)
      const platformsToSave = selectedPlatforms;

      let finalIconUrl = initialData?.icon_url ?? null;

      if (iconType === 'upload' && iconFile) {
        // Upload to Supabase Storage
        const fileExt = iconFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-assets')
          .upload(filePath, iconFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-assets')
          .getPublicUrl(filePath);
        
        finalIconUrl = publicUrl;
      } else if (iconType === 'auto') {
        finalIconUrl = url ? `https://www.google.com/s2/favicons?domain=${url}&sz=128` : null;
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
        icon_url: finalIconUrl,
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
      <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50">
          <CardTitle className="text-xl">개발자 정보</CardTitle>
          <CardDescription>개인 프로젝트인지 팀 프로젝트인지 선택해주세요.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div 
              onClick={() => setAuthorRole("individual")}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                authorRole === "individual" 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-black/5"
              )}
            >
              <UserIcon className={cn("w-6 h-6 mb-2 transition-colors", authorRole === "individual" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
              <h4 className={cn("font-semibold transition-colors", authorRole === "individual" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>개인</h4>
            </div>
            <div 
              onClick={() => setAuthorRole("team")}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                authorRole === "team" 
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:shadow-black/5"
              )}
            >
              <Users className={cn("w-6 h-6 mb-2 transition-colors", authorRole === "team" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
              <h4 className={cn("font-semibold transition-colors", authorRole === "team" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>팀</h4>
            </div>
          </div>

          {authorRole === "team" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2" id="team_name_section">
                <Label htmlFor="team_name" className="text-sm font-medium">팀 이름 <span className="text-red-500">*</span></Label>
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
      <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50">
          <CardTitle className="text-xl">기본 정보</CardTitle>
          <CardDescription>프로젝트를 잘 나타낼 수 있는 이름과 설명을 작성해주세요.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          <div className="space-y-4" id="icon_section">
            <Label className="text-sm font-medium">아이콘 설정 <span className="text-red-500">*</span></Label>
            <div className="grid sm:grid-cols-2 gap-4">
              <div 
                onClick={() => handleIconTypeChange("auto")}
                className={cn(
                  "flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                  iconType === "auto" 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                )}
              >
                <Globe className={cn("w-5 h-5 mr-3 transition-colors", iconType === "auto" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                <div>
                  <h4 className={cn("font-medium text-sm transition-colors", iconType === "auto" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>웹사이트에서 가져오기</h4>
                  <p className="text-xs text-zinc-500">파비콘 자동 추출 (실패 시 기본 아이콘)</p>
                </div>
              </div>
              <div 
                onClick={() => handleIconTypeChange("upload")}
                className={cn(
                  "flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                  iconType === "upload" 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                )}
              >
                <Upload className={cn("w-5 h-5 mr-3 transition-colors", iconType === "upload" ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />
                <div>
                  <h4 className={cn("font-medium text-sm transition-colors", iconType === "upload" ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>이미지 업로드</h4>
                  <p className="text-xs text-zinc-500">512px 이하 정사각형 PNG/JPG</p>
                </div>
              </div>
            </div>

            {iconType === 'upload' && (
              <div className="mt-4 p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center animate-in fade-in slide-in-from-top-2">
                {iconPreview ? (
                  <div className="relative group">
                    <img src={iconPreview} alt="Preview" className="w-24 h-24 rounded-2xl object-cover shadow-md border border-zinc-200 dark:border-zinc-800" />
                    <button 
                      type="button" 
                      onClick={() => { setIconFile(null); setIconPreview(null); setIconError(""); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-center mt-2 text-xs text-zinc-500">이미지가 선택되었습니다.</p>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                      <ImageIcon className="w-6 h-6 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">이미지 클릭하여 업로드</p>
                    <p className="text-xs text-zinc-500 mt-1">PNG, JPG (최대 512x512, 1:1 비율)</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndSetIcon(file);
                  }}
                />
              </div>
            )}
            {iconError && <p className="text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 mt-2">{iconError}</p>}
          </div>

          <div className="space-y-2" id="title_section">
            <Label htmlFor="title" className="text-sm font-medium">프로젝트 이름 <span className="text-red-500">*</span></Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 대곽 유틸리티 허브" className="h-11 rounded-xl" />
          </div>

          <div className="space-y-2" id="url_section">
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
          
          <div className="space-y-2" id="short_description_section">
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

          <div className="space-y-2" id="description_section">
            <Label htmlFor="description" className="text-sm font-medium">상세 설명 <span className="text-red-500">*</span></Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="상세 페이지에서 보여질 프로젝트의 자세한 기능, 개발 배경, 사용 기술 등을 자유롭게 작성해주세요." className="min-h-[200px] rounded-xl resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* 분류 및 기능 */}
      <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50">
          <CardTitle className="text-xl">분류 및 기능</CardTitle>
          <CardDescription>어떤 종류의 프로젝트이며, 어떤 기능들을 제공하나요?</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          
          <div className="space-y-3" id="type_section">
            <Label htmlFor="type" className="text-sm font-medium">프로그램 종류 <span className="text-red-500">*</span></Label>
            <Select value={type} onValueChange={(val) => setType(val || "")}>
              <SelectTrigger id="type" className="h-11 rounded-xl bg-white dark:bg-zinc-900/50">
                <SelectValue placeholder="프로그램 종류를 선택하세요">
                  {PROJECT_TYPES.find(pt => pt.value === type)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                {PROJECT_TYPES.map(pt => (
                  <SelectItem key={pt.value} value={pt.value} className="focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:text-blue-600 dark:focus:text-blue-400">
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">주요 기능 / 카테고리 (다중 선택)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FEATURES.map(feature => (
                <div 
                  key={feature.value} 
                  onClick={() => handleFeatureChange(feature.value, !selectedFeatures.includes(feature.value))}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-xl border-2 transition-all duration-200 ease-out cursor-pointer select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                    selectedFeatures.includes(feature.value)
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <Checkbox 
                    checked={selectedFeatures.includes(feature.value)}
                    className="hidden"
                  />
                  <Label className="cursor-pointer text-sm font-semibold w-full">
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
      <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50">
          <CardTitle className="text-xl">환경 및 소스코드</CardTitle>
          <CardDescription>어디서 실행되며 소스코드는 어떻게 관리되나요?</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-2">
              {PLATFORMS.map(platform => (
                <div 
                  key={platform.value} 
                  onClick={() => handlePlatformChange(platform.value, !selectedPlatforms.includes(platform.value))}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-xl border-2 transition-all duration-200 ease-out cursor-pointer select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                    selectedPlatforms.includes(platform.value)
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <Checkbox 
                    checked={selectedPlatforms.includes(platform.value)}
                    className="hidden"
                  />
                  <Label className="cursor-pointer text-sm font-semibold w-full">
                    {platform.label}
                  </Label>
                </div>
              ))}
            </div>
            {type !== 'app' && (
              <p className="text-[11px] text-zinc-500 bg-zinc-800/5 py-1.5 px-3 rounded-lg border border-zinc-800/10 inline-block">
                💡 {type === 'website' ? '웹사이트는 보통 모든 플랫폼을 지원하므로 전체 선택을 권장합니다.' : '이 종류의 프로젝트는 일반적으로 모든 플랫폼에서 실행 가능합니다.'}
              </p>
            )}

          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Label className="text-sm font-medium text-zinc-900 dark:text-zinc-200">소스코드 공개 여부</Label>
            <div className="grid sm:grid-cols-2 gap-4">
              {SOURCE_TYPES.map(stype => (
                <div 
                  key={stype.value}
                  onClick={() => setSourceType(stype.value as SourceType)}
                  className={cn(
                    "flex flex-col items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                    sourceType === stype.value 
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {stype.value === 'open' ? <Code2 className={cn("w-5 h-5 transition-colors", sourceType === stype.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} /> : <Lock className={cn("w-5 h-5 transition-colors", sourceType === stype.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />}
                    <h4 className={cn("font-semibold transition-colors", sourceType === stype.value ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>{stype.label}</h4>
                  </div>
                  <p className={cn("text-xs transition-colors", sourceType === stype.value ? "text-blue-700 dark:text-blue-400" : "text-zinc-500")}>
                    {stype.value === 'open' ? "누구나 코드를 볼 수 있습니다." : "소스코드를 비공개로 유지합니다."}
                  </p>
                </div>
              ))}
            </div>

            {sourceType === 'open' && (
              <div id="repo_url_section" className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl animate-in fade-in slide-in-from-top-2">
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
                <div 
                  key={lf.value} 
                  onClick={() => handleLicenseFeatureChange(lf.value, !licenseFeatures.includes(lf.value))}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-xl border-2 transition-all duration-200 ease-out cursor-pointer select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                    licenseFeatures.includes(lf.value)
                      ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-blue-200 dark:hover:border-blue-800"
                  )}
                >
                  <Checkbox 
                    checked={licenseFeatures.includes(lf.value)}
                    className="hidden"
                  />
                  <Label className="cursor-pointer text-sm font-semibold w-full">
                    {lf.label}
                  </Label>
                </div>
              ))}
              <div 
                onClick={() => setHasCustomLicense(!hasCustomLicense)}
                className={cn(
                  "flex items-center space-x-2 p-3 rounded-xl border-2 transition-all duration-200 ease-out cursor-pointer select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                  hasCustomLicense
                    ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md shadow-blue-500/10"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-blue-200 dark:hover:border-blue-800"
                )}
              >
                <Checkbox checked={hasCustomLicense} className="hidden" />
                <Label className="cursor-pointer text-sm font-semibold w-full">
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
      <Card className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="bg-white/40 dark:bg-zinc-800/40 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800/50">
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
                  "flex flex-col items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-out select-none will-change-transform hover:scale-[1.02] active:scale-[0.98]",
                  visibility === v.value 
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10" 
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-blue-200 dark:hover:border-blue-800"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {v.value === 'public' ? <Globe className={cn("w-5 h-5 transition-colors", visibility === v.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} /> : <Lock className={cn("w-5 h-5 transition-colors", visibility === v.value ? "text-blue-600 dark:text-blue-400" : "text-zinc-500")} />}
                  <h4 className={cn("font-semibold transition-colors", visibility === v.value ? "text-blue-900 dark:text-blue-100" : "text-zinc-700 dark:text-zinc-300")}>{v.label}</h4>
                </div>
                <p className={cn("text-xs transition-colors", visibility === v.value ? "text-blue-700 dark:text-blue-400" : "text-zinc-500")}>
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
        <button 
          type="button" 
          onClick={() => router.back()} 
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }), 
            "rounded-full px-8 text-base h-12 transition-all duration-200 ease-out will-change-transform hover:scale-[1.05] active:scale-[0.95]"
          )}
        >
          취소
        </button>
        <button 
          type="submit" 
          disabled={isLoading || shortDesc.length > 100}
          className={cn(
            buttonVariants({ size: "lg" }), 
            "rounded-full px-8 text-base bg-blue-600 hover:bg-blue-700 text-white h-12 flex items-center shadow-lg shadow-blue-500/20 transition-all duration-200 ease-out will-change-transform hover:scale-[1.05] active:scale-[0.95]", 
            (isLoading || shortDesc.length > 100) && "opacity-50 cursor-not-allowed"
          )} 
        >
          {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UploadCloud className="w-5 h-5 mr-2" />}
          {isEdit ? "프로젝트 수정하기" : "프로젝트 게시하기"}
        </button>
      </div>
    </form>
  );
}
