"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Globe, Code2, Users, User as UserIcon, Plus, X, Link as LinkIcon, Loader2, Image as ImageIcon, Trash2, Rocket, Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  PROJECT_TYPES,
  PLATFORMS,
  SOURCE_TYPES,
  LICENSE_FEATURES,
  FEATURES,
  VISIBILITY,
  GUIDE_PROGRAM_TYPES,
  isAllowedEmail
} from "@/lib/constants";
import { ImageUploadInput } from "@/components/shared/image-upload-input";
import { EditorTabs, type EditorTab } from "@/components/shared/editor-tabs";
import { ProjectIcon } from "@/components/projects/project-icon";
import { SelectCard } from "@/components/forms/select-card";
import { ToggleChip } from "@/components/forms/toggle-chip";
import { ChoiceRow } from "@/components/forms/choice-row";
import { FormSection } from "@/components/forms/form-section";
import { FormRail, type FormRailSection } from "@/components/forms/form-rail";
import { TYPE_ICONS, PLATFORM_ICONS, CATEGORY_ICONS } from "@/lib/type-icons";
import { SECTION_COLORS } from "@/lib/section-colors";
import { Markdown } from "@/components/shared/markdown";
import { parseGithubRepo } from "@/lib/github-readme";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow } from "@/lib/types";

type Visibility = 'public' | 'private';
type SourceType = 'open' | 'closed';
type AuthorRole = 'individual' | 'team';
type IconType = 'auto' | 'link';

type TeamMemberProfile = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

interface ProjectFormProps {
  initialData?: ProjectRow;
  isEdit?: boolean;
  canDelete?: boolean;
}

export function ProjectForm({ initialData, isEdit = false, canDelete = true }: ProjectFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [title, setTitle] = useState<string>(initialData?.title ?? "");
  const [types, setTypes] = useState<string[]>(initialData?.types ?? []);
  const isWebsite = types.includes('website');
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialData?.source_type as SourceType) ?? "open",
  );
  const [visibility, setVisibility] = useState<Visibility>(
    initialData?.visibility ?? "public",
  );
  
  // 설명
  const [shortDesc, setShortDesc] = useState<string>(initialData?.short_description ?? "");
  const [description, setDescription] = useState<string>(initialData?.description ?? "");
  const [descTab, setDescTab] = useState<EditorTab>("write");
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // GitHub README 가져오기
  const [readmeUrl, setReadmeUrl] = useState<string>(initialData?.repo_url ?? "");
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState("");
  const [readmeNote, setReadmeNote] = useState("");
  const [showReadmeDialog, setShowReadmeDialog] = useState(false);

  // 작성자 정보
  const [authorRole, setAuthorRole] = useState<AuthorRole>(
    initialData?.author_role ?? "individual",
  );
  const [teamName, setTeamName] = useState<string>(initialData?.team_name ?? "");
  const [teamMembers, setTeamMembers] = useState<string[]>(initialData?.team_members ?? []);
  const [teamMemberProfiles, setTeamMemberProfiles] = useState<Record<string, TeamMemberProfile>>({});
  const [currentMember, setCurrentMember] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // 허용 사용자 (비공개)
  const [allowedUsers, setAllowedUsers] = useState<string[]>(initialData?.allowed_users ?? []);
  const [currentUser, setCurrentUser] = useState("");
  const [userError, setUserError] = useState("");

  // 플랫폼 & 기능
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialData?.platforms ?? []);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureCustom, setFeatureCustom] = useState<string>(initialData?.feature_custom ?? "");

  // 아이콘
  const [iconType, setIconType] = useState<IconType>(
    (initialData?.icon_type === 'link') ? 'link' : (initialData?.icon_type ?? "auto")
  );
  const [iconUrl, setIconUrl] = useState<string>(initialData?.icon_url ?? "");
  const [iconPreview, setIconPreview] = useState<string | null>(initialData?.icon_url ?? null);
  const [autoIconPreview, setAutoIconPreview] = useState<string | null>(
    initialData?.icon_type === 'auto' ? (initialData?.icon_url ?? null) : null
  );
  const autoFaviconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [url, setUrl] = useState<string>(initialData?.url ?? "");
  const [repoUrl, setRepoUrl] = useState<string>(initialData?.repo_url ?? "");

  // 라이선스
  const [licenseFeatures, setLicenseFeatures] = useState<string[]>(initialData?.license_features ?? []);
  const [hasCustomLicense, setHasCustomLicense] = useState(!!initialData?.license_custom);
  const [licenseCustom, setLicenseCustom] = useState<string>(initialData?.license_custom ?? "");

  const handleDescKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const value = el.value;
      const INDENT = "  ";
      if (start === end) {
        const next = value.slice(0, start) + INDENT + value.slice(end);
        setDescription(next);
        requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + INDENT.length; });
      } else {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const selected = value.slice(lineStart, end);
        const lines = selected.split("\n");
        const transformed = e.shiftKey
          ? lines.map(l => l.replace(/^( {1,2}|\t)/, "")).join("\n")
          : lines.map(l => INDENT + l).join("\n");
        const next = value.slice(0, lineStart) + transformed + value.slice(end);
        setDescription(next);
        requestAnimationFrame(() => { el.selectionStart = lineStart; el.selectionEnd = lineStart + transformed.length; });
      }
    }
  };

  const importReadme = async () => {
    setShowReadmeDialog(false);
    setReadmeLoading(true);
    setReadmeError("");
    setReadmeNote("");
    try {
      const res = await fetch(`/api/github-readme?url=${encodeURIComponent(readmeUrl.trim())}`);
      const data = (await res.json()) as { markdown?: string; truncated?: boolean; error?: string };
      if (!res.ok || !data.markdown) {
        setReadmeError(data.error ?? "README를 가져오지 못했어요.");
        return;
      }
      setDescription(data.markdown);
      if (sourceType === 'open' && !repoUrl.trim()) setRepoUrl(readmeUrl.trim());
      setReadmeNote(
        data.truncated
          ? "README가 너무 길어 앞부분만 가져왔어요. 필요한 부분을 고쳐 주세요."
          : "README를 가져왔어요. 아래 칸에서 자유롭게 고칠 수 있어요.",
      );
    } catch {
      setReadmeError("README를 가져오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      setReadmeLoading(false);
    }
  };

  // 이미 쓴 설명이 있으면 덮어쓰기 전에 한 번 물어본다
  const requestReadme = () => {
    if (readmeLoading) return;
    setReadmeError("");
    setReadmeNote("");
    if (!parseGithubRepo(readmeUrl)) {
      setReadmeError("GitHub 저장소 링크를 입력해 주세요. 예: https://github.com/username/repo");
      return;
    }
    if (description.trim()) {
      setShowReadmeDialog(true);
      return;
    }
    void importReadme();
  };

  const addTeamMember = async () => {
    const email = currentMember.trim();
    if (!email) return;
    if (!isAllowedEmail(email)) {
      setMemberError("@ts.hs.kr 이메일 주소만 입력 가능합니다.");
      return;
    }
    if (teamMembers.includes(email)) {
      setMemberError("이미 추가된 팀원입니다.");
      return;
    }
    setMemberLoading(true);
    const { data: profile } = await supabase
      .from('users')
      .select('id, nickname, full_name, avatar_url')
      .eq('email', email)
      .maybeSingle();
    setMemberLoading(false);
    if (!profile) {
      setMemberError("가입되지 않은 사용자입니다.");
      return;
    }
    setTeamMembers(prev => [...prev, email]);
    setTeamMemberProfiles(prev => ({ ...prev, [email]: profile }));
    setCurrentMember("");
    setMemberError("");
  };

  const removeTeamMember = (member: string) => {
    if (member === currentUserEmail) return;
    setTeamMembers(prev => prev.filter(m => m !== member));
    setTeamMemberProfiles(prev => {
      const next = { ...prev };
      delete next[member];
      return next;
    });
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

  const fetchAutoFavicon = (targetUrl: string) => {
    if (!targetUrl) { setAutoIconPreview(null); return; }
    try { new URL(targetUrl); } catch { setAutoIconPreview(null); return; }
    if (autoFaviconTimer.current) clearTimeout(autoFaviconTimer.current);
    autoFaviconTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/favicon?url=${encodeURIComponent(targetUrl)}&v=2`, { cache: 'no-store' });
        const data = await res.json();
        setAutoIconPreview(data.faviconUrl ?? null);
      } catch {
        setAutoIconPreview(null);
      }
    }, 600);
  };

  useEffect(() => {
    if (iconType === 'auto') fetchAutoFavicon(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isWebsite) {
      setSelectedPlatforms(PLATFORMS.map(p => p.value));
    }
  }, [isWebsite]);

  const toggleType = (value: string) => {
    setTypes(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  };

  // 편집 모드: 기존 팀원 프로필 로드
  useEffect(() => {
    const emails = initialData?.team_members;
    if (!emails?.length) return;
    supabase
      .from('users')
      .select('id, email, nickname, full_name, avatar_url')
      .in('email', emails)
      .then(({ data }) => {
        if (!data) return;
        const profiles: Record<string, TeamMemberProfile> = {};
        (data as Array<{ email: string } & TeamMemberProfile>).forEach(u => {
          profiles[u.email] = { id: u.id, nickname: u.nickname, full_name: u.full_name, avatar_url: u.avatar_url };
        });
        setTeamMemberProfiles(profiles);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closed Source 전환 시 라이선스 초기화
  useEffect(() => {
    if (sourceType === 'closed') {
      setLicenseFeatures([]);
      setHasCustomLicense(false);
      setLicenseCustom("");
    }
  }, [sourceType]);

  // 비공개 팀 프로젝트: 팀원을 allowedUsers에 자동 동기화
  useEffect(() => {
    if (visibility === 'private' && authorRole === 'team') {
      setAllowedUsers(prev => [...new Set([...prev, ...teamMembers])]);
    }
  }, [visibility, authorRole, teamMembers]);

  // 팀 모드 전환 시 현재 로그인 사용자 자동 추가
  useEffect(() => {
    if (authorRole !== 'team') return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      const email = user.email;
      setCurrentUserEmail(email);
      setTeamMembers(prev => prev.includes(email) ? prev : [...prev, email]);
      supabase
        .from('users')
        .select('id, nickname, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) setTeamMemberProfiles(prev => ({ ...prev, [email]: profile }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorRole]);

  const handleIconTypeChange = (newType: IconType) => {
    setIconType(newType);
    if (newType === 'auto') {
      setIconUrl("");
      setIconPreview(null);
      fetchAutoFavicon(url);
    }
  };

  const handleIconChange = (url: string) => {
    setIconUrl(url);
    setIconPreview(url || null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("로그인이 필요합니다.");
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', initialData!.id)
        .eq('author_id', session.user.id);
      if (error) throw error;
      router.push('/explore');
      router.refresh();
    } catch (err) {
      console.error('[ProjectForm] delete error:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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

    if (iconType === 'link' && !iconUrl) {
      setErrorMsg("아이콘 이미지를 업로드하거나 URL을 입력해주세요.");
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

    if (types.length === 0) {
      setErrorMsg("프로그램 종류를 하나 이상 선택해주세요.");
      scrollToField("type_section");
      return;
    }

    if (types.includes('app') && selectedPlatforms.length === 0) {
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

      let finalIconUrl: string | null;
      if (iconType === 'link') {
        finalIconUrl = iconUrl || null;
      } else if (url) {
        try {
          const res = await fetch(`/api/favicon?url=${encodeURIComponent(url)}&v=2`, { cache: 'no-store' });
          const data = await res.json();
          finalIconUrl = data.faviconUrl ?? null;
        } catch {
          finalIconUrl = null;
        }
      } else {
        finalIconUrl = null;
      }

      const commonFields = {
        title,
        short_description: shortDesc,
        description,
        // 선택 순서와 관계없이 PROJECT_TYPES 순서로 저장
        types: PROJECT_TYPES.map(t => t.value).filter(v => types.includes(v)),
        platforms: platformsToSave,
        source_type: sourceType,
        repo_url: sourceType === 'open' ? repoUrl : null,
        license_features: sourceType === 'open' ? licenseFeatures : [],
        license_custom: sourceType === 'open' && hasCustomLicense ? licenseCustom : null,
        features: selectedFeatures,
        feature_custom: selectedFeatures.includes('other') ? featureCustom : null,
        visibility,
        allowed_users: visibility === 'private'
          ? [...new Set([...allowedUsers, ...(authorRole === 'team' ? teamMembers : [])])]
          : [],
        author_role: authorRole,
        team_name: authorRole === 'team' ? teamName : null,
        team_members: authorRole === 'team' ? teamMembers : [],
        url,
        icon_type: iconType,
        icon_url: finalIconUrl,
        updated_at: new Date().toISOString()
      };

      if (isEdit && initialData?.id) {
        // 수정 시 author_id 는 포함하지 않음 — 원작자 변경 방지 (개발자 계정 포함)
        const { error } = await supabase.from('projects').update(commonFields).eq('id', initialData.id);
        if (error) throw error;
        router.push(`/projects/${initialData.id}`);
      } else {
        const { data, error } = await supabase.from('projects').insert([{ ...commonFields, author_id: session.user.id }]).select().single();
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

  // 목차 레일·필수 항목 집계 — 필수 7: 아이콘, 이름, 링크, 간단 설명, 상세 설명, 종류, 플랫폼
  const iconReady = iconType === "auto" ? Boolean(url.trim()) : Boolean(iconUrl.trim());
  const requiredFlags = [
    iconReady,
    Boolean(title.trim()),
    Boolean(url.trim()),
    Boolean(shortDesc.trim()),
    Boolean(description.trim()),
    types.length > 0,
    selectedPlatforms.length > 0,
  ];
  const requiredDone = requiredFlags.filter(Boolean).length;
  const railSections: FormRailSection[] = [
    { id: "section-basic", title: "기본 정보", done: iconReady && Boolean(title.trim()) && Boolean(url.trim()) && Boolean(shortDesc.trim()) },
    { id: "section-description", title: "상세 설명", done: Boolean(description.trim()) },
    { id: "section-category", title: "분류", done: types.length > 0 && selectedPlatforms.length > 0 },
    { id: "section-source", title: "소스코드·라이선스", done: sourceType === "closed" || Boolean(repoUrl.trim()) },
    { id: "section-visibility", title: "공개 범위·만든 사람", done: authorRole === "individual" || Boolean(teamName.trim()) },
  ];
  const typeDesc = (value: string) => GUIDE_PROGRAM_TYPES.find((t) => t.value === value)?.desc;

  const labelClass = "text-[13px] font-semibold text-zinc-900 dark:text-white";
  const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";
  const req = <span className="ml-0.5 text-rose-600" aria-hidden>*</span>;
  const descTextareaClass =
    "min-h-[260px] w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100";
  const descPreviewClass =
    "min-h-[260px] overflow-auto rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950/40";
  const showDanger = isEdit && canDelete && Boolean(initialData?.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl items-start gap-10">
      <form onSubmit={handleSubmit} className="grid min-w-0 flex-1 gap-[18px] lg:max-w-3xl">
        {errorMsg && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* 1. 기본 정보 */}
        <FormSection id="section-basic" title="기본 정보">
          <div className="grid gap-2" id="icon_section">
            <Label className={labelClass}>아이콘{req}</Label>
            <div className="flex items-start gap-4">
              <ProjectIcon
                src={iconType === "auto" ? autoIconPreview : iconUrl || null}
                title={title || "?"}
                className="h-[72px] w-[72px] shrink-0 rounded-[22%] ring-[3px] ring-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)] dark:ring-zinc-950"
                decorative
              />
              <div className="grid min-w-0 flex-1 gap-2">
                <div className="flex flex-wrap gap-2">
                  <ToggleChip pressed={iconType === "auto"} onToggle={() => handleIconTypeChange("auto")} label="URL에서 자동 추출" icon={Globe} />
                  <ToggleChip pressed={iconType === "link"} onToggle={() => handleIconTypeChange("link")} label="직접 올리기" icon={ImageIcon} />
                </div>
                <p className={hintClass}>웹사이트 링크를 넣으면 파비콘을 가져와요. 마음에 안 들면 직접 올려요.</p>
              </div>
            </div>
            {iconType === "link" && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <ImageUploadInput value={iconUrl} onChange={handleIconChange} shape="square" previewSize="md" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5" id="title_section">
              <Label htmlFor="title" className={labelClass}>프로젝트 이름{req}</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 급식알리미" className="h-11 rounded-xl" />
            </div>
            <div className="grid gap-1.5" id="url_section">
              <Label htmlFor="url" className={labelClass}>웹사이트 또는 다운로드 링크{req}</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl pl-9" />
              </div>
            </div>
          </div>

          <div className="grid gap-1.5" id="short_description_section">
            <div className="flex items-end justify-between">
              <Label htmlFor="short_description" className={labelClass}>간단 설명{req}</Label>
              <span className={cn("text-xs tabular-nums", shortDesc.length > 100 ? "font-medium text-rose-600" : "text-zinc-500")}>
                {shortDesc.length} / 100
              </span>
            </div>
            <Textarea
              id="short_description"
              value={shortDesc}
              onChange={e => setShortDesc(e.target.value)}
              placeholder="탐색 카드에 보일 한 줄 설명"
              className={cn("min-h-[72px] resize-none rounded-xl", shortDesc.length > 100 && "border-rose-500 focus-visible:ring-rose-500")}
            />
            <p className={hintClass}>탐색 카드에 2줄까지 보여요. 60자 안쪽이 좋아요.</p>
          </div>
        </FormSection>

        {/* 2. 상세 설명 */}
        <FormSection id="section-description" title="상세 설명" hint="마크다운">
          <div className="grid gap-2.5" id="description_section">
            <div className="grid gap-1.5" id="readme_import">
              <Label htmlFor="readme_url" className={labelClass}>GitHub에서 가져오기</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Code2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                  <Input
                    id="readme_url"
                    value={readmeUrl}
                    onChange={e => setReadmeUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requestReadme(); } }}
                    placeholder="https://github.com/username/repo"
                    className="h-11 rounded-xl pl-9"
                  />
                </div>
                <button
                  type="button"
                  onClick={requestReadme}
                  disabled={readmeLoading}
                  className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full px-4 text-sm", readmeLoading && "cursor-not-allowed opacity-50")}
                >
                  {readmeLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Download className="mr-1.5 h-4 w-4" aria-hidden />}
                  README 가져오기
                </button>
              </div>
              {readmeError ? (
                <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{readmeError}</p>
              ) : (
                <p className={hintClass} aria-live="polite">{readmeNote || "저장소 링크를 넣고 누르면 README가 상세 설명으로 채워져요."}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <EditorTabs value={descTab} onChange={setDescTab} />
              <span className={hintClass}>Tab으로 두 칸 들여쓰기, Shift+Tab으로 해제</span>
            </div>
            {descTab === "write" && (
              <textarea
                ref={descTextareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleDescKeyDown}
                spellCheck={false}
                placeholder={"# 프로젝트 이름\n\n프로젝트의 자세한 기능, 개발 배경, 사용 기술 등을 자유롭게 적어 주세요.\n\n## 주요 기능\n- 기능 1\n- 기능 2"}
                className={descTextareaClass}
              />
            )}
            {descTab === "preview" && (
              <div className={descPreviewClass}>
                {description.trim() ? <Markdown>{description}</Markdown> : <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>}
              </div>
            )}
            {descTab === "split" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <textarea
                  ref={descTextareaRef}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onKeyDown={handleDescKeyDown}
                  spellCheck={false}
                  placeholder={"# 프로젝트 이름\n\n마크다운으로 자유롭게 작성하세요."}
                  className={descTextareaClass}
                />
                <div className={descPreviewClass}>
                  {description.trim() ? <Markdown>{description}</Markdown> : <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* 3. 분류 */}
        <FormSection id="section-category" title="분류">
          <div className="grid gap-2.5" id="type_section">
            <Label className={labelClass}>
              프로그램 종류{req} <span className="font-medium text-zinc-500 dark:text-zinc-400">(여러 개)</span>
            </Label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {PROJECT_TYPES.map(pt => (
                <SelectCard
                  key={pt.value}
                  icon={TYPE_ICONS[pt.value]}
                  label={pt.label}
                  description={typeDesc(pt.value)}
                  selected={types.includes(pt.value)}
                  onSelect={() => toggleType(pt.value)}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2.5" id="platforms_section">
            <Label className={labelClass}>지원 플랫폼{req}</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(platform => (
                <ToggleChip
                  key={platform.value}
                  pressed={selectedPlatforms.includes(platform.value)}
                  disabled={isWebsite}
                  onToggle={() => handlePlatformChange(platform.value, !selectedPlatforms.includes(platform.value))}
                  label={platform.label}
                  icon={PLATFORM_ICONS[platform.value]}
                />
              ))}
            </div>
            {isWebsite && (
              <p className={hintClass}>웹사이트는 모든 플랫폼의 브라우저에서 열 수 있어서 전체 플랫폼이 자동으로 선택돼요.</p>
            )}
          </div>

          <div className="grid gap-2.5">
            <Label className={labelClass}>
              카테고리 <span className="font-medium text-zinc-500 dark:text-zinc-400">(여러 개)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {FEATURES.map(feature => (
                <ToggleChip
                  key={feature.value}
                  pressed={selectedFeatures.includes(feature.value)}
                  onToggle={() => handleFeatureChange(feature.value, !selectedFeatures.includes(feature.value))}
                  label={feature.label}
                  icon={CATEGORY_ICONS[feature.value]}
                />
              ))}
            </div>
            {selectedFeatures.includes("other") && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Input placeholder="기타 기능/카테고리를 직접 적어 주세요" value={featureCustom} onChange={e => setFeatureCustom(e.target.value)} className="h-11 rounded-xl" />
              </div>
            )}
          </div>
        </FormSection>

        {/* 4. 소스코드·라이선스 */}
        <FormSection id="section-source" title="소스코드·라이선스">
          <div className="grid gap-2.5">
            <Label className={labelClass}>소스코드 공개</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SOURCE_TYPES.map(stype => (
                <ChoiceRow
                  key={stype.value}
                  icon={stype.value === "open" ? Code2 : Lock}
                  label={stype.value === "open" ? "오픈소스" : "비공개"}
                  description={stype.value === "open" ? "저장소 링크를 함께 올려요" : "코드는 공개하지 않아요"}
                  selected={sourceType === stype.value}
                  onSelect={() => setSourceType(stype.value as SourceType)}
                />
              ))}
            </div>
          </div>

          {sourceType === "open" && (
            <div className="grid gap-1.5 animate-in fade-in slide-in-from-top-2" id="repo_url_section">
              <Label htmlFor="repo_url" className={labelClass}>저장소 링크{req}</Label>
              <div className="relative">
                <Code2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <Input id="repo_url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/username/repo" className="h-11 rounded-xl pl-9" />
              </div>
            </div>
          )}

          <div className={cn("grid gap-2.5", sourceType === "closed" && "pointer-events-none select-none opacity-40")}>
            <Label className={labelClass}>허용하는 것</Label>
            <div className="flex flex-wrap gap-2">
              {LICENSE_FEATURES.map(lf => (
                <ToggleChip
                  key={lf.value}
                  pressed={licenseFeatures.includes(lf.value)}
                  onToggle={() => handleLicenseFeatureChange(lf.value, !licenseFeatures.includes(lf.value))}
                  label={lf.label}
                />
              ))}
              <ToggleChip pressed={hasCustomLicense} onToggle={() => setHasCustomLicense(!hasCustomLicense)} label="기타 (직접 입력)" />
            </div>
            <p className={hintClass}>
              {sourceType === "closed"
                ? "소스코드를 비공개로 두면 라이선스 항목을 고를 수 없어요."
                : "체크하지 않은 항목은 상세 페이지에 \"제한\"으로 표시돼요."}
            </p>
            {hasCustomLicense && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Input value={licenseCustom} onChange={e => setLicenseCustom(e.target.value)} placeholder="기타 라이선스 조건" className="h-11 rounded-xl" />
              </div>
            )}
          </div>
        </FormSection>

        {/* 5. 공개 범위·만든 사람 */}
        <FormSection id="section-visibility" title="공개 범위·만든 사람">
          <div className="grid gap-2.5">
            <Label className={labelClass}>공개 여부</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {VISIBILITY.map(v => (
                <ChoiceRow
                  key={v.value}
                  icon={v.value === "public" ? Globe : Lock}
                  label={v.label}
                  description={v.value === "public" ? "누구나 볼 수 있어요" : "내가 고른 사람만 볼 수 있어요"}
                  selected={visibility === v.value}
                  onSelect={() => setVisibility(v.value as Visibility)}
                />
              ))}
            </div>
          </div>

          {visibility === "private" && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-900 dark:text-white">열람을 허용할 사용자 <span className="font-medium text-zinc-500 dark:text-zinc-400">(@ts.hs.kr)</span></Label>
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
                    aria-label="접근 허용 사용자 추가"
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {userError && <p className="text-xs text-red-500 mt-1">{userError}</p>}
                {allowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {allowedUsers.map(user => {
                      const isTeamMember = authorRole === 'team' && teamMembers.includes(user);
                      return (
                        <div key={user} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium", isTeamMember ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}>
                          {user}
                          {isTeamMember ? (
                            <span className="text-xs text-blue-500 dark:text-blue-400 ml-0.5">팀원</span>
                          ) : (
                            <button type="button" onClick={() => removeAllowedUser(user)} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2.5">
            <Label className={labelClass}>만든 사람</Label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <ChoiceRow icon={UserIcon} label="개인" description="내 이름으로 올려요" selected={authorRole === "individual"} onSelect={() => setAuthorRole("individual")} />
              <ChoiceRow icon={Users} label="팀" description="팀 이름과 팀원을 적어요" selected={authorRole === "team"} onSelect={() => setAuthorRole("team")} />
            </div>
          </div>

          {authorRole === "team" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2" id="team_name_section">
                <Label htmlFor="team_name" className="text-[13px] font-semibold text-zinc-900 dark:text-white">팀 이름<span className="ml-0.5 text-rose-600" aria-hidden>*</span></Label>
                <Input id="team_name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="팀 이름을 입력하세요" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-900 dark:text-white">팀원 추가 <span className="font-medium text-zinc-500 dark:text-zinc-400">(@ts.hs.kr)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={currentMember}
                    onChange={(e) => { setCurrentMember(e.target.value); setMemberError(""); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addTeamMember(); } }}
                    placeholder="팀원 학교 이메일 입력 후 추가 버튼 또는 엔터"
                    className={cn("h-11 rounded-xl flex-1", memberError && "border-red-500 focus-visible:ring-red-500")}
                  />
                  <button
                    type="button"
                    onClick={() => void addTeamMember()}
                    disabled={memberLoading}
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                  >
                    {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                {memberError && <p className="text-xs text-red-500 mt-1">{memberError}</p>}
                {teamMembers.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {teamMembers.map(email => {
                      const profile = teamMemberProfiles[email];
                      const name = profile?.nickname || profile?.full_name || email;
                      const isMe = email === currentUserEmail;
                      return (
                        <div key={email} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50">
                          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold shrink-0">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{name}</div>
                            <div className="text-xs text-zinc-500 truncate">{email}{isMe && " · 나"}</div>
                          </div>
                          {!isMe && (
                            <button type="button" onClick={() => removeTeamMember(email)} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </FormSection>

        {/* 6. 위험 구역 — 수정 페이지, 소유자만 */}
        {showDanger && (
          <FormSection id="section-danger" title="위험 구역" hint="수정 페이지에서만" danger>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">삭제하면 리뷰까지 함께 사라지고 되돌릴 수 없어요.</p>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-9 shrink-0 rounded-full border-rose-300 px-4 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40",
                )}
              >
                <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                프로젝트 삭제
              </button>
            </div>
          </FormSection>
        )}

        <div className="flex items-center justify-end gap-2.5 pb-6 pt-1">
          <button type="button" onClick={() => router.back()} className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 rounded-full px-4 text-sm")}>
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading || shortDesc.length > 100}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-full px-5 text-sm transition-[background-color,scale] active:scale-[0.96]",
              SECTION_COLORS.new.button,
              (isLoading || shortDesc.length > 100) && "cursor-not-allowed opacity-50",
            )}
          >
            {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Rocket className="mr-1.5 h-4 w-4" aria-hidden />}
            {isEdit ? "저장하기" : "등록하기"}
          </button>
        </div>
      </form>

      <FormRail sections={railSections} requiredDone={requiredDone} requiredTotal={requiredFlags.length} className="sticky top-24 hidden w-[200px] shrink-0 lg:grid" />

      <Dialog open={showReadmeDialog} onOpenChange={setShowReadmeDialog}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">쓰던 설명을 README로 바꿀까요?</DialogTitle>
            <DialogDescription>
              지금 상세 설명에 적은 내용이 GitHub README로 바뀌어요. 되돌릴 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" onClick={() => setShowReadmeDialog(false)} className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
              취소
            </button>
            <button type="button" onClick={() => void importReadme()} className={cn(buttonVariants(), "rounded-xl")}>
              바꾸기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDanger && (
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent showCloseButton={false} className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">정말 삭제하시겠습니까?</DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{initialData?.title}</span> 프로젝트와 모든 관련 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  buttonVariants(),
                  "rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center",
                  isDeleting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                삭제하기
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
