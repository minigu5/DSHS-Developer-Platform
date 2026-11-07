"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Globe, Code2, Users, User as UserIcon, VenetianMask, Plus, X, Link as LinkIcon, Loader2, Image as ImageIcon, Trash2, Rocket, Download, RefreshCw, Megaphone } from "lucide-react";

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
import { LockNotice } from "@/components/projects/lock-notice";
import { ProjectIcon } from "@/components/projects/project-icon";
import { SelectCard } from "@/components/forms/select-card";
import { ToggleChip } from "@/components/forms/toggle-chip";
import { ChoiceRow } from "@/components/forms/choice-row";
import { FormSection } from "@/components/forms/form-section";
import { FormRail, type FormRailSection } from "@/components/forms/form-rail";
import { TYPE_ICONS, PLATFORM_ICONS, CATEGORY_ICONS } from "@/lib/type-icons";
import { SECTION_COLORS } from "@/lib/section-colors";
import { Markdown } from "@/components/shared/markdown";
import { ConfirmNameInput } from "@/components/shared/confirm-name-input";
import { nameMatches } from "@/lib/confirm-name";
import { parseGithubRepo } from "@/lib/github-readme";
import { closeDomainOfPrivateProject, deleteProject } from "@/lib/projects/actions";
import { addGithubToProfile } from "@/lib/profile/actions";
import { domainOfferOf, previewAddressOf, quickToConnect } from "@/lib/domains/offer";
import { shouldFollowNext, withProject } from "@/lib/domains/next-path";
import { fixOldAddresses } from "@/lib/domains/old-address";
import { createClient } from "@/lib/supabase/client";
import { useUnsavedWarning } from "@/lib/use-unsaved-warning";
import type { ProjectRow, UserContact } from "@/lib/types";
import { BannedNotice } from "@/components/shared/banned-notice";
import { openPosterSheet } from "@/components/posters/poster-sheet-nav";
import { posterImageAt } from "@/lib/posters/hang-logic";
import { friendlyWriteError } from "@/lib/admin/ban";
import { useMyBan } from "@/lib/admin/use-my-ban";

type Visibility = 'public' | 'private';
type SourceType = 'open' | 'closed';
type AuthorRole = 'individual' | 'team' | 'anonymous';
type IconType = 'auto' | 'link';

type TeamMemberProfile = {
  id: string;
  nickname: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

// 같은 저장소인지 비교하는 키. GitHub 저장소 링크가 아니면 빈 문자열.
function repoKey(input: string): string {
  const target = parseGithubRepo(input);
  return target ? `${target.owner}/${target.repo}`.toLowerCase() : "";
}

interface ProjectFormProps {
  /** 사용자 키로 읽은 행이라 author_id·poster_id·poster_hung_at 은 없다(PROJECT_COLUMNS) */
  initialData?: Omit<ProjectRow, 'author_id' | 'poster_id' | 'poster_hung_at'>;
  isEdit?: boolean;
  canDelete?: boolean;
  /** 이 프로젝트에 살아 있는 주소(서브도메인) 이름 — 삭제하면 함께 반납돼요 */
  subdomainName?: string | null;
  /** 연결된(active) 주소 이름과 옛 사이트 주소 후보 — 상세 설명에 옛 주소가 있으면 새 주소로 바꿀지 묻는다 */
  oldAddress?: { name: string; prefixes: string[] } | null;
  /** 관리자 잠금(수정 화면) — 있으면 "공개"를 고를 수 없고 이유를 보여 준다 */
  lock?: { reason: string | null } | null;
  /** 새 등록에서 종류를 미리 고른다(도메인 마련하기 → 대곽나루 흐름의 "웹사이트") */
  initialType?: string | null;
  /** 등록이 끝나면 돌아갈 /domains 경로(검증된 값). 있으면 권유 창 없이 그리로 가고, 방문 주소는 비워도 된다 */
  nextHref?: string | null;
}

export function ProjectForm({ initialData, isEdit = false, canDelete = true, subdomainName = null, oldAddress = null, lock = null, initialType = null, nextHref = null }: ProjectFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const ban = useMyBan();
  const [errorMsg, setErrorMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrivateDialog, setShowPrivateDialog] = useState(false);
  // 저장 없이 주소만 닫기(이미 비공개인데 주소가 남은 경우) — 같은 확인 창을 쓴다
  const [closeOnly, setCloseOnly] = useState(false);
  // 삭제·주소 반납 확인 창에서 직접 적는 프로젝트 이름 — 저장된 이름(initialData.title)과 같아야 버튼이 켜진다
  const [confirmName, setConfirmName] = useState("");
  const savedTitle = initialData?.title ?? "";
  const confirmed = nameMatches(confirmName, savedTitle);
  // 등록 직후 방문 주소가 호스트 무료 주소(.vercel.app 등)면 도메인 마련하기를 권한다
  const [domainOffer, setDomainOffer] = useState<{ projectId: string; hostLabel: string; hostname: string; suggestion: string | null; quick: boolean } | null>(null);

  const [title, setTitle] = useState<string>(initialData?.title ?? "");
  const [types, setTypes] = useState<string[]>(initialData?.types ?? (initialType ? [initialType] : []));
  const isWebsite = types.includes('website');
  // 대곽나루 서버에 붙일 웹사이트는 방문 주소가 아직 없을 수 있다 — 새 등록이고 돌아갈 곳이 있을 때만 비워도 된다
  const urlOptional = !isEdit && nextHref !== null && isWebsite;
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialData?.source_type as SourceType) ?? "open",
  );
  const [visibility, setVisibility] = useState<Visibility>(
    initialData?.visibility ?? "public",
  );
  // 살아 있는 주소가 있는 프로젝트를 비공개로 바꾸는 저장 — 저장하면 주소도 반납돼요
  const closesDomain = isEdit && Boolean(subdomainName) && visibility === "private" && initialData?.visibility !== "private";
  // 이미 비공개로 저장됐는데 주소가 살아 있음 — 비공개 전환 때 반납이 실패한 뒤 새로 고쳤거나, 폼을 거치지 않고 비공개로 바뀐 경우.
  // (비공개 프로젝트는 새로 주소를 받을 수 없으니 이 상태는 의도치 않은 것) 저장 없이 주소만 닫는 길을 보여 준다.
  const strandedDomain = isEdit && Boolean(subdomainName) && initialData?.visibility === "private" && visibility === "private";

  // 설명
  const [shortDesc, setShortDesc] = useState<string>(initialData?.short_description ?? "");
  const [description, setDescription] = useState<string>(initialData?.description ?? "");
  const [descTab, setDescTab] = useState<EditorTab>("write");
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);

  // GitHub README 가져오기 · 자동 동기화 (저장소 링크는 아래 repoUrl 하나를 같이 쓴다)
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState("");
  // 편집 탭 줄의 "GitHub README 가져오기" 버튼이 여는 창 — 링크 입력 + 자동 동기화 선택을 한곳에 모았다
  const [showReadmeDialog, setShowReadmeDialog] = useState(false);
  const [readmeSync, setReadmeSync] = useState<boolean>(initialData?.readme_sync ?? false);
  // 설명 속 옛 사이트 주소 — 쓰는 대로 다시 찾는다. "괜찮아요"는 이 화면에서만 다시 안 묻고, 바꾼 뒤엔 저장 안내 한 줄
  const oldFix = oldAddress ? fixOldAddresses(description, oldAddress.prefixes, oldAddress.name) : null;
  const [oldAddressDismissed, setOldAddressDismissed] = useState(false);
  const [oldAddressReplaced, setOldAddressReplaced] = useState(false);
  // 창 안의 "자동 동기화" 선택(기본 켜짐). 가져오기가 성공하면 (오픈소스일 때) 이 값대로 동기화를 켠다. 취소·실패하면 그대로 둔다.
  const [readmeSyncChoice, setReadmeSyncChoice] = useState(true);

  // 작성자 정보
  const [authorRole, setAuthorRole] = useState<AuthorRole>(
    initialData?.author_role ?? "individual",
  );
  const [teamName, setTeamName] = useState<string>(initialData?.team_name ?? "");
  const [teamIconUrl, setTeamIconUrl] = useState<string>(initialData?.team_icon_url ?? "");
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
  // 웹사이트는 모든 플랫폼 — 옛 프로젝트에 일부만 저장돼 있어도 처음부터 전체로 보여 준다
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(() =>
    initialData?.types?.includes('website') ? PLATFORMS.map(p => p.value) : (initialData?.platforms ?? []),
  );
  // 웹사이트를 고르기 전 플랫폼 — 웹사이트를 빼면 이 값으로 되돌린다.
  // 처음부터 웹사이트인 프로젝트는 일부만 저장된 옛 값이 있으면 그것, 전체면 빈 값
  const platformsBeforeWebsiteRef = useRef<string[]>(
    initialData?.types?.includes('website') && (initialData.platforms?.length ?? 0) < PLATFORMS.length
      ? (initialData.platforms ?? [])
      : [],
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialData?.features ?? []);
  const [featureCustom, setFeatureCustom] = useState<string>(initialData?.feature_custom ?? "");

  // 아이콘
  const [iconType, setIconType] = useState<IconType>(
    (initialData?.icon_type === 'link') ? 'link' : (initialData?.icon_type ?? "auto")
  );
  const [iconUrl, setIconUrl] = useState<string>(initialData?.icon_url ?? "");
  const [autoIconPreview, setAutoIconPreview] = useState<string | null>(
    initialData?.icon_type === 'auto' ? (initialData?.icon_url ?? null) : null
  );
  const autoFaviconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [url, setUrl] = useState<string>(initialData?.url ?? "");
  // Firebase·Pages 미리보기 주소는 며칠 뒤 사라진다 — 원래 주소로 바꾸게 알린다
  const previewAddress = previewAddressOf(url);
  // 수정 화면: 주소를 아직 안 받은 소유자에게 주소 칸 아래 한 줄로 다시 권한다
  const editDomainOffer = isEdit && canDelete && !subdomainName && isWebsite && visibility === 'public' && initialData?.id ? domainOfferOf(url) : null;
  const [repoUrl, setRepoUrl] = useState<string>(initialData?.repo_url ?? "");
  // 저장소 링크는 GitHub 저장소만 받는다(2026-11-07 — vercel 주소를 적은 프로젝트가 있었음). 입력칸을 벗어난 뒤부터 경고, 수정 화면은 처음부터
  const [repoChecked, setRepoChecked] = useState(Boolean(initialData?.repo_url));
  const repoNotGithub = sourceType === "open" && Boolean(repoUrl.trim()) && !parseGithubRepo(repoUrl);

  // 라이선스
  // 비공개 소스는 라이선스를 저장하지 않으므로 처음부터 비워 둔다
  const initialClosed = initialData?.source_type === 'closed';
  const [licenseFeatures, setLicenseFeatures] = useState<string[]>(initialClosed ? [] : (initialData?.license_features ?? []));
  const [hasCustomLicense, setHasCustomLicense] = useState(!initialClosed && !!initialData?.license_custom);
  const [licenseCustom, setLicenseCustom] = useState<string>(initialClosed ? "" : (initialData?.license_custom ?? ""));

  // GitHub 라이선스 가져오기 — 저장소 링크 입력칸을 벗어날 때, 또는 README를 가져온 뒤 저장소마다 한 번.
  // origin 이 'user' 면(처음부터 값이 있었거나 칩을 직접 건드림) 덮어쓰지 않는다. 'auto' 는 우리가 채운 값이라
  // 다른 저장소로 바뀌면 다시 채운다. 수정 화면에서는 원래 저장소를 다시 가져오지 않는다.
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [licenseNote, setLicenseNote] = useState("");
  const licenseRepoRef = useRef(repoKey(initialData?.repo_url ?? ""));
  const licenseOriginRef = useRef<"none" | "auto" | "user">(
    !initialClosed && (initialData?.license_features?.length || initialData?.license_custom) ? "user" : "none",
  );

  // await 뒤에 다시 읽는 값이라 TS 가 앞선 검사로 좁혀 둔 타입을 쓰지 않게 함수로 읽는다.
  const touchedByUser = () => licenseOriginRef.current === "user";

  const fillLicenseFromRepo = async (input: string) => {
    const key = repoKey(input);
    if (sourceType !== "open" || !key || key === licenseRepoRef.current) return;
    if (touchedByUser()) return;
    licenseRepoRef.current = key;
    setLicenseLoading(true);
    setLicenseError("");
    setLicenseNote("");
    try {
      const res = await fetch(`/api/github-license?url=${encodeURIComponent(input.trim())}`);
      const data = (await res.json()) as { name?: string; features?: string[]; error?: string };
      if (licenseRepoRef.current !== key) return;
      if (!res.ok || !data.features) {
        // 한도·서버 오류는 다시 시도할 수 있게 열어 둔다
        if (res.status === 429 || res.status >= 500) licenseRepoRef.current = "";
        setLicenseError(data.error ?? "라이선스를 가져오지 못했어요. 직접 골라 주세요.");
        return;
      }
      if (touchedByUser()) return; // 불러오는 사이 칩을 직접 골랐다
      licenseOriginRef.current = "auto";
      setLicenseFeatures(data.features);
      setLicenseNote(`${data.name ?? "라이선스"}: GitHub 정보로 채웠어요. 다르면 직접 바꿔 주세요.`);
    } catch {
      if (licenseRepoRef.current === key) licenseRepoRef.current = "";
      setLicenseError("라이선스를 가져오지 못했어요. 직접 골라 주세요.");
    } finally {
      if (licenseRepoRef.current === key || licenseRepoRef.current === "") setLicenseLoading(false);
    }
  };

  // 개인 프로젝트 등록 중 GitHub 저장소 링크를 넣으면, 프로필에 GitHub 연락처가 없을 때 그 자리에서 넣을지 묻는다.
  // 저장소 칸을 벗어나거나 README를 가져온 뒤에 묻는다(입력 중에는 안 뜨게). "괜찮아요"를 누르면 이 화면에선 다시 안 묻는다.
  const [profileGithub, setProfileGithub] = useState<"unknown" | "none" | "has">("unknown");
  const [githubOfferOwner, setGithubOfferOwner] = useState<string | null>(null);
  const [githubOffer, setGithubOffer] = useState<"idle" | "saving" | "done" | "dismissed">("idle");
  const [githubOfferError, setGithubOfferError] = useState("");

  useEffect(() => {
    if (isEdit) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('users')
        .select('contacts')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const contacts = (data?.contacts ?? []) as UserContact[];
          setProfileGithub(contacts.some(c => c.type === 'github' && c.value.trim()) ? "has" : "none");
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  const offerGithubFor = (input: string) => {
    setGithubOfferOwner(parseGithubRepo(input)?.owner ?? null);
  };

  const addGithub = async () => {
    if (githubOffer === "saving") return;
    setGithubOffer("saving");
    setGithubOfferError("");
    const res = await addGithubToProfile(repoUrl);
    if (res.ok) {
      setGithubOfferOwner(res.username);
      setGithubOffer("done");
    } else {
      setGithubOffer("idle");
      setGithubOfferError(res.error);
    }
  };

  const showGithubOffer =
    !isEdit &&
    authorRole === "individual" &&
    sourceType === "open" &&
    profileGithub === "none" &&
    (githubOffer === "idle" || githubOffer === "saving") &&
    githubOfferOwner !== null &&
    parseGithubRepo(repoUrl)?.owner === githubOfferOwner;

  // 동기화 중(읽기 전용)인 설명 칸에 글을 쓰려고 하면 "끄기" 버튼 옆에 동기화를 끄라고 알려 준다
  const [lockedEditTried, setLockedEditTried] = useState(false);
  // 휴대폰은 읽기 전용 칸에 키보드가 안 떠서 누르기·붙여넣기·끌어다 놓기도 고치려는 것으로 본다
  const lockedEditProps = readmeSync && sourceType === "open"
    ? { onClick: () => setLockedEditTried(true), onPaste: () => setLockedEditTried(true), onDrop: () => setLockedEditTried(true) }
    : {};
  const handleDescKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readmeSync && sourceType === "open") {
      // 글자·지우기·줄바꿈만 — 화살표·복사(⌘C) 같은 읽기 동작은 그냥 둔다
      const editing = (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) || ["Backspace", "Delete", "Enter", "Tab"].includes(e.key);
      if (editing) setLockedEditTried(true);
      return;
    }
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
    setReadmeLoading(true);
    setReadmeError("");
    try {
      const res = await fetch(`/api/github-readme?url=${encodeURIComponent(repoUrl.trim())}`);
      const data = (await res.json()) as { markdown?: string; error?: string };
      if (!res.ok || !data.markdown) {
        setReadmeError(data.error ?? "README를 가져오지 못했어요.");
        return;
      }
      setDescription(data.markdown);
      // 오픈소스면 창에서 고른 대로 자동 동기화를 켠다(기본 켜짐)
      setReadmeSync(sourceType === "open" && readmeSyncChoice);
      setShowReadmeDialog(false);
      void fillLicenseFromRepo(repoUrl);
      offerGithubFor(repoUrl);
    } catch {
      setReadmeError("README를 가져오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
    } finally {
      setReadmeLoading(false);
    }
  };

  const openReadmeDialog = () => {
    setReadmeError("");
    setReadmeSyncChoice(true);
    setShowReadmeDialog(true);
  };

  // 이미 쓴 설명이 있으면 창 안에 덮어쓰기 경고를 보여 준다(따로 묻지 않음)
  const requestReadme = () => {
    if (readmeLoading) return;
    setReadmeError("");
    if (!parseGithubRepo(repoUrl)) {
      setReadmeError("GitHub 저장소 링크를 입력해 주세요. 예: https://github.com/username/repo");
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
    licenseOriginRef.current = "user";
    setLicenseFeatures(prev => checked ? [...prev, val] : prev.filter(p => p !== val));
  };

  const isValidUrl = (value: string) => {
    if (!value) return false;
    try { new URL(value); return true; } catch { return false; }
  };

  const fetchAutoFavicon = (targetUrl: string) => {
    if (!isValidUrl(targetUrl)) { setAutoIconPreview(null); return; }
    scheduleFaviconFetch(targetUrl);
  };

  // 입력이 멈추면 파비콘을 가져온다 — 결과는 타이머 안에서만 상태에 넣는다
  const scheduleFaviconFetch = (targetUrl: string) => {
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
    if (iconType === 'auto' && isValidUrl(url)) scheduleFaviconFetch(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleType = (value: string) => {
    const adding = !types.includes(value);
    setTypes(adding ? [...types, value] : types.filter(t => t !== value));
    if (value !== 'website') return;
    if (adding) {
      platformsBeforeWebsiteRef.current = selectedPlatforms;
      setSelectedPlatforms(PLATFORMS.map(p => p.value));
    } else {
      // 웹사이트를 빼면 자동으로 켠 플랫폼을 고르기 전 상태로 되돌린다
      setSelectedPlatforms(platformsBeforeWebsiteRef.current);
    }
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
  const handleSourceTypeChange = (next: SourceType) => {
    setSourceType(next);
    if (next === 'closed') {
      setLicenseFeatures([]);
      setHasCustomLicense(false);
      setLicenseCustom("");
      licenseOriginRef.current = "none";
      licenseRepoRef.current = "";
      setLicenseError("");
      setLicenseNote("");
    }
  };

  // 비공개 팀 프로젝트: 팀원은 접근 허용 목록에 늘 들어간다 — 저장할 때 합치고, 화면에도 합쳐 보여 준다
  const shownAllowedUsers = visibility === 'private' && authorRole === 'team'
    ? [...new Set([...allowedUsers, ...teamMembers])]
    : allowedUsers;

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

  // 저장 안 한 변경이 있으면 다른 곳으로 갈 때 브라우저 경고. 순서만 달라진 배열은 같은 값으로 본다.
  const sorted = (list: string[]) => [...list].sort();
  const formSnapshot = JSON.stringify([
    title, shortDesc, description, sorted(types), sorted(selectedPlatforms),
    sourceType, repoUrl, readmeSync, sorted(licenseFeatures), hasCustomLicense, licenseCustom,
    sorted(selectedFeatures), featureCustom, visibility, sorted(allowedUsers),
    authorRole, teamName, teamIconUrl, sorted(teamMembers), url, iconType, iconUrl,
  ]);
  const [initialSnapshot] = useState(formSnapshot);
  const { allowLeave } = useUnsavedWarning(formSnapshot !== initialSnapshot);

  const handleIconTypeChange = (newType: IconType) => {
    setIconType(newType);
    if (newType === 'auto') {
      setIconUrl("");
      fetchAutoFavicon(url);
    }
  };

  const handleIconChange = (url: string) => {
    setIconUrl(url);
  };

  // 주소(서브도메인)가 있으면 서버 액션이 먼저 반납하고 DNS 레코드를 지운다
  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const result = await deleteProject(initialData!.id, confirmName);
    setIsDeleting(false);
    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }
    setShowDeleteDialog(false);
    allowLeave();
    router.push('/explore');
    router.refresh();
  };

  // 도메인 마련하기로 연결할 수 있는 호스트 주소이고, 주소를 아직 3개 다 쓰지 않았을 때만
  const domainOfferFor = async (rawUrl: string, userId: string) => {
    const offer = domainOfferOf(rawUrl);
    if (!offer) return null;
    const { count, error } = await supabase
      .from('subdomains')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .in('status', ['reserved', 'pending', 'active', 'broken']);
    if (!error && (count ?? 0) >= 3) return null;
    return { hostLabel: offer.hostLabel, hostname: offer.hostname, suggestion: offer.suggestion, quick: quickToConnect(offer.host) };
  };

  // 권유 창을 닫으면 원래대로 프로젝트 페이지로
  const finishDomainOffer = (takeDomain: boolean) => {
    if (!domainOffer) return;
    router.push(takeDomain ? `/domains?project=${domainOffer.projectId}` : `/projects/${domainOffer.projectId}`);
    router.refresh();
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

    if (!url && !urlOptional) {
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

    if (repoNotGithub) {
      setRepoChecked(true);
      setErrorMsg("저장소 링크는 GitHub 저장소 주소(https://github.com/username/repo)만 받아요. 코드가 GitHub에 없으면 소스코드를 '비공개'로 골라 주세요.");
      scrollToField("repo_url_section");
      return;
    }

    if (closesDomain) {
      setShowPrivateDialog(true);
      return;
    }
    await saveProject();
  };

  const closeDomainNow = async () => {
    if (!initialData?.id) return;
    setIsLoading(true);
    setErrorMsg("");
    const closed = await closeDomainOfPrivateProject(initialData.id);
    setIsLoading(false);
    if (!closed.ok) {
      setErrorMsg(closed.error);
      return;
    }
    router.refresh();
  };

  // 저장에 성공하면 페이지가 바뀔 때까지 다시 저장하지 않는다 — 이동이 1~2초 걸리는 동안 버튼을 또 눌러 같은 프로젝트가 여러 번 등록됐다(2026-11-04).
  // state 는 다음 렌더까지 안 바뀌므로 빠른 연속 클릭은 ref 로 막는다.
  const savingRef = useRef(false);

  const saveProject = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
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
        readme_sync: sourceType === 'open' && readmeSync,
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
        team_icon_url: authorRole === 'team' && teamIconUrl.trim() ? teamIconUrl.trim() : null,
        team_members: authorRole === 'team' ? teamMembers : [],
        url: url.trim() === '' && urlOptional ? null : url,
        icon_type: iconType,
        icon_url: finalIconUrl,
        updated_at: new Date().toISOString()
      };

      if (isEdit && initialData?.id) {
        // 수정 시 author_id 는 포함하지 않음 — 원작자 변경 방지 (개발자 계정 포함)
        const { error } = await supabase.from('projects').update(commonFields).eq('id', initialData.id);
        if (error) throw error;
        if (closesDomain) {
          // 방문 주소가 이 주소로 저장된 뒤에 반납해야 이전 방문 주소로 되돌아간다. 실패해도 비공개 저장은 끝난 상태 — 다시 저장하면 반납을 다시 시도한다.
          const closed = await closeDomainOfPrivateProject(initialData.id);
          if (!closed.ok) throw new Error(`비공개로는 저장했지만 주소는 아직 닫히지 않았어요. ${closed.error}`);
        }
        allowLeave();
        router.push(`/projects/${initialData.id}`);
      } else {
        // select('id') — 사용자 키는 author_id 를 못 읽어서 전체 칸으로 돌려받으면 권한 오류
        const { data, error } = await supabase.from('projects').insert([{ ...commonFields, author_id: session.user.id }]).select('id').single();
        if (error) throw error;
        allowLeave();
        if (nextHref && shouldFollowNext(nextHref, { isWebsite, isPublic: visibility === 'public' })) {
          router.push(withProject(nextHref, data.id));
          router.refresh();
          return;
        }
        const offer = isWebsite && visibility === 'public' ? await domainOfferFor(url, session.user.id) : null;
        if (offer) {
          setDomainOffer({ projectId: data.id, ...offer });
          return;
        }
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
      msg = friendlyWriteError(msg, ban.until) ?? msg;
      if (msg.includes('project_locked')) {
        msg = '관리자가 잠근 프로젝트라 공개로 바꿀 수 없어요.';
      } else if (msg.includes('projects_duplicate_recent')) {
        msg = '방금 같은 이름으로 등록한 프로젝트가 있어요. 내 프로젝트에서 확인해 주세요.';
      }
      setErrorMsg(msg);
      savingRef.current = false;
      setIsLoading(false);
    }
  };

  // 목차 레일·필수 항목 집계 — 필수: 아이콘, 이름, 링크, 간단 설명, 상세 설명, 종류 + (앱일 때만) 플랫폼 — handleSubmit 검사와 같게
  const iconReady = iconType === "auto" ? Boolean(url.trim()) || urlOptional : Boolean(iconUrl.trim());
  const platformsRequired = types.includes("app");
  const platformsReady = !platformsRequired || selectedPlatforms.length > 0;
  const requiredFlags = [
    iconReady,
    Boolean(title.trim()),
    Boolean(url.trim()) || urlOptional,
    Boolean(shortDesc.trim()),
    Boolean(description.trim()),
    types.length > 0,
    ...(platformsRequired ? [platformsReady] : []),
  ];
  const requiredDone = requiredFlags.filter(Boolean).length;
  const railSections: FormRailSection[] = [
    { id: "section-basic", title: "기본 정보", done: iconReady && Boolean(title.trim()) && (Boolean(url.trim()) || urlOptional) && Boolean(shortDesc.trim()) },
    { id: "section-description", title: "상세 설명", done: Boolean(description.trim()) },
    { id: "section-category", title: "분류", done: types.length > 0 && platformsReady },
    { id: "section-source", title: "소스코드·라이선스", done: sourceType === "closed" || (Boolean(repoUrl.trim()) && !repoNotGithub) },
    { id: "section-visibility", title: "공개 범위·만든 사람", done: authorRole !== "team" || Boolean(teamName.trim()) },
    // 포스터는 프로젝트가 있어야 만들 수 있어서 수정 화면에만 있다
    ...(isEdit && initialData?.id ? [{ id: "section-poster", title: "홍보 포스터", done: Boolean(initialData.poster_image_url) }] : []),
  ];
  const typeDesc = (value: string) => GUIDE_PROGRAM_TYPES.find((t) => t.value === value)?.desc;

  const labelClass = "text-[13px] font-semibold text-zinc-900 dark:text-white";
  const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";
  const req = <span className="ml-0.5 text-rose-600" aria-hidden>*</span>;
  const descTextareaClass =
    "min-h-[260px] w-full resize-y rounded-2xl border border-zinc-200 bg-white p-4 font-mono text-sm leading-relaxed text-zinc-900 outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-100";
  const descLockedClass = "cursor-default bg-zinc-50 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-400";
  // 동기화 중에는 사이트에서 설명을 고칠 수 없다 (다음 동기화가 덮어쓰므로). 오픈소스일 때만 유효.
  const descLocked = readmeSync && sourceType === "open";
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
              <Label htmlFor="url" className={labelClass}>웹사이트 또는 다운로드 링크{!urlOptional && req}</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <Input id="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="h-11 rounded-xl pl-9" />
              </div>
              {urlOptional && <p className={hintClass}>방문 주소는 비워도 돼요. 대곽나루 서버에 주소를 붙인 뒤에 바꿔도 돼요.</p>}
              {previewAddress ? (
                <div role="alert" className="grid gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                  <p>
                    <span className="font-semibold">며칠 뒤 사라지는 미리보기 주소예요.</span> {previewAddress.host}의 미리보기 주소는 기한이 지나면 안 열리고, 도메인 마련하기에도 쓸 수 없어요.
                    원래 주소(<span className="font-mono">{previewAddress.live}</span>)를 넣어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => setUrl(`https://${previewAddress.live}/`)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 justify-self-start rounded-full border-rose-300 bg-white px-3 text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950")}
                  >
                    원래 주소로 바꾸기
                  </button>
                </div>
              ) : (
                editDomainOffer && (
                  <p className={hintClass}>
                    짧은 주소도 받을 수 있어요{editDomainOffer.suggestion && <> (예: <span className="font-mono">{editDomainOffer.suggestion}.dshs.dev</span>)</>}.{" "}
                    <a href={`/domains?project=${initialData?.id}`} className="font-medium text-teal-700 underline underline-offset-2 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300">
                      도메인 마련하기
                    </a>
                  </p>
                )
              )}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <EditorTabs value={descTab} onChange={setDescTab} />
              {descLocked ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {lockedEditTried && (
                    <span role="status" className="text-xs font-semibold text-rose-600 break-keep dark:text-rose-400">
                      고치려면 먼저 동기화를 끄세요
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    README와 동기화 중
                  </span>
                  <button
                    type="button"
                    onClick={() => { setReadmeSync(false); setLockedEditTried(false); }}
                    className={cn(
                      buttonVariants({ variant: lockedEditTried ? "outline" : "ghost" }),
                      "h-7 rounded-full px-3 text-xs",
                      lockedEditTried && "border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40",
                    )}
                  >
                    끄기
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openReadmeDialog}
                  className={cn(buttonVariants({ variant: "outline" }), "h-7 rounded-full px-3 text-xs")}
                >
                  <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                  GitHub README 가져오기
                </button>
              )}
            </div>
            {descTab === "write" && (
              <textarea
                ref={descTextareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={handleDescKeyDown}
                readOnly={descLocked}
                {...lockedEditProps}
                spellCheck={false}
                placeholder={"# 프로젝트 이름\n\n프로젝트의 자세한 기능, 개발 배경, 사용 기술 등을 자유롭게 적어 주세요.\n\n## 주요 기능\n- 기능 1\n- 기능 2"}
                className={cn(descTextareaClass, descLocked && descLockedClass)}
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
                  readOnly={descLocked}
                  {...lockedEditProps}
                  spellCheck={false}
                  placeholder={"# 프로젝트 이름\n\n마크다운으로 자유롭게 작성하세요."}
                  className={cn(descTextareaClass, descLocked && descLockedClass)}
                />
                <div className={descPreviewClass}>
                  {description.trim() ? <Markdown>{description}</Markdown> : <p className="text-sm text-zinc-500">작성한 내용이 여기에 미리보기로 표시돼요.</p>}
                </div>
              </div>
            )}
            {oldAddress && oldFix && oldFix.count > 0 && !oldAddressDismissed && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/40">
                <p className="text-sm font-semibold text-teal-900 break-keep dark:text-teal-200">
                  설명에 옛 주소가 남아 있어요. <span className="font-mono">{oldAddress.name}.dshs.dev</span>로 바꿀까요?
                </p>
                <ul className="mt-2 space-y-2">
                  {oldFix.lines.slice(0, 3).map((line, i) => (
                    <li key={i} className="rounded-xl bg-white px-3 py-2 text-xs dark:bg-zinc-900">
                      <p className="line-clamp-2 break-all text-zinc-500 dark:text-zinc-400">
                        <span className="sr-only">지금: </span>
                        <del>{line.before}</del>
                      </p>
                      <p className="mt-1 line-clamp-2 break-all font-medium text-zinc-900 dark:text-white">
                        <span className="sr-only">바꾸면: </span>
                        {line.after}
                      </p>
                    </li>
                  ))}
                </ul>
                {oldFix.lines.length > 3 && (
                  <p className="mt-2 text-xs text-teal-900 dark:text-teal-200">외 {oldFix.lines.length - 3}줄도 같이 바뀌어요.</p>
                )}
                {descLocked && (
                  <p className="mt-2 text-xs text-teal-900 break-keep dark:text-teal-200">
                    README와 동기화 중이라 GitHub README도 고쳐야 해요. 안 고치면 README가 바뀔 때 옛 주소로 돌아가요.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(oldFix.text);
                      setOldAddressReplaced(true);
                    }}
                    className={cn("inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors", SECTION_COLORS.domains.button)}
                  >
                    새 주소로 바꾸기
                  </button>
                  <button
                    type="button"
                    onClick={() => setOldAddressDismissed(true)}
                    className={cn(buttonVariants({ variant: "ghost" }), "h-9 rounded-full px-4 text-sm")}
                  >
                    괜찮아요
                  </button>
                </div>
              </div>
            )}
            {oldAddress && oldAddressReplaced && oldFix?.count === 0 && (
              <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
                설명의 주소를 <span className="font-mono">{oldAddress.name}.dshs.dev</span>로 바꿨어요. 저장하면 반영돼요.
              </p>
            )}
            {descLocked ? (
              <p className={hintClass}>매일 밤 GitHub README로 다시 채워져서 여기서는 고칠 수 없어요. 고치려면 동기화를 끄세요.</p>
            ) : descTab !== "preview" && (
              <p className={cn(hintClass, "hidden sm:block")}>Tab으로 두 칸 들여쓰기, Shift+Tab으로 해제</p>
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
                  onSelect={() => handleSourceTypeChange(stype.value as SourceType)}
                />
              ))}
            </div>
          </div>

          {sourceType === "open" && (
            <div className="grid gap-1.5 animate-in fade-in slide-in-from-top-2" id="repo_url_section">
              <Label htmlFor="repo_url" className={labelClass}>저장소 링크{req}</Label>
              <div className="relative">
                <Code2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <Input id="repo_url" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} onBlur={() => { setRepoChecked(true); void fillLicenseFromRepo(repoUrl); offerGithubFor(repoUrl); }} placeholder="https://github.com/username/repo" aria-invalid={repoChecked && repoNotGithub} aria-describedby={repoChecked && repoNotGithub ? "repo_url_error" : undefined} className="h-11 rounded-xl pl-9" />
              </div>
              {repoChecked && repoNotGithub && (
                <p id="repo_url_error" className="text-xs font-medium text-rose-600 break-keep dark:text-rose-400">
                  GitHub 저장소 주소만 적을 수 있어요(예: https://github.com/username/repo). 사이트 주소는 위 &quot;방문 주소&quot;에, 코드가 GitHub에 없으면 소스코드를 &quot;비공개&quot;로 골라 주세요.
                </p>
              )}
              {showGithubOffer && (
                <div className="mt-1 flex flex-col gap-3 rounded-xl border border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
                  <div className="grid gap-0.5">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">프로필에도 GitHub를 추가할까요?</p>
                    <p className={hintClass}>github.com/{githubOfferOwner} · 내 프로필 연락처에 바로 들어가요</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setGithubOffer("dismissed")}
                      disabled={githubOffer === "saving"}
                      className={buttonVariants({ variant: "ghost", className: "h-9 rounded-full px-4" })}
                    >
                      괜찮아요
                    </button>
                    <button
                      type="button"
                      onClick={() => void addGithub()}
                      disabled={githubOffer === "saving"}
                      className={buttonVariants({ className: "h-9 rounded-full px-4" })}
                    >
                      {githubOffer === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                      추가하기
                    </button>
                  </div>
                </div>
              )}
              {githubOfferError && showGithubOffer && (
                <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{githubOfferError}</p>
              )}
              {githubOffer === "done" && (
                <p className={hintClass} aria-live="polite">프로필에 GitHub를 추가했어요 · github.com/{githubOfferOwner}</p>
              )}
            </div>
          )}

          <div className="grid gap-2.5">
            <Label className={cn(labelClass, sourceType === "closed" && "opacity-40")}>허용하는 것</Label>
            <div className="flex flex-wrap gap-2">
              {LICENSE_FEATURES.map(lf => (
                <ToggleChip
                  key={lf.value}
                  pressed={licenseFeatures.includes(lf.value)}
                  onToggle={() => handleLicenseFeatureChange(lf.value, !licenseFeatures.includes(lf.value))}
                  label={lf.label}
                  disabled={sourceType === "closed"}
                />
              ))}
              <ToggleChip pressed={hasCustomLicense} onToggle={() => { licenseOriginRef.current = "user"; setHasCustomLicense(!hasCustomLicense); }} label="기타 (직접 입력)" disabled={sourceType === "closed"} />
            </div>
            <p className={hintClass}>
              {sourceType === "closed"
                ? "소스코드를 비공개로 두면 라이선스 항목을 고를 수 없어요."
                : "체크하지 않은 항목은 상세 페이지에 \"제한\"으로 표시돼요."}
            </p>
            {licenseLoading ? (
              <p className={hintClass} aria-live="polite">GitHub에서 라이선스를 확인하고 있어요…</p>
            ) : licenseError ? (
              <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{licenseError}</p>
            ) : licenseNote ? (
              <p className={hintClass} aria-live="polite">{licenseNote}</p>
            ) : null}
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
                  disabled={Boolean(lock) && v.value === "public"}
                  disabledReason={lock && v.value === "public" ? "관리자가 잠가서 공개할 수 없어요" : null}
                />
              ))}
            </div>
          </div>

          {lock && <LockNotice reason={lock.reason} />}

          {closesDomain && (
            <div role="status" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              비공개로 저장하면 이 프로젝트의 주소 <span className="font-mono font-semibold">{subdomainName}.dshs.dev</span>도 반납돼요. 저장할 때 한 번 더 물어봐요.
            </div>
          )}

          {strandedDomain && (
            <div role="status" className="flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:flex-row sm:items-center dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <p className="flex-1">
                비공개 프로젝트지만 주소가 아직 열려 있어요: <span className="font-mono font-semibold">{subdomainName}.dshs.dev</span>
              </p>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setCloseOnly(true);
                  setShowPrivateDialog(true);
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-rose-950"
              >
                주소 닫기
              </button>
            </div>
          )}

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
                    <Plus className="w-4 h-4" aria-hidden />
                  </button>
                </div>
                {userError && <p className="text-xs text-red-500 mt-1">{userError}</p>}
                {shownAllowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {shownAllowedUsers.map(user => {
                      const isTeamMember = authorRole === 'team' && teamMembers.includes(user);
                      return (
                        <div key={user} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium", isTeamMember ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300")}>
                          {user}
                          {isTeamMember ? (
                            <span className="text-xs text-blue-500 dark:text-blue-400 ml-0.5">팀원</span>
                          ) : (
                            <button type="button" onClick={() => removeAllowedUser(user)} aria-label={`${user} 접근 허용 빼기`} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5">
                              <X className="w-3.5 h-3.5" aria-hidden />
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
            <div className="grid gap-2.5 sm:grid-cols-3">
              <ChoiceRow icon={UserIcon} label="개인" description="내 이름으로 올려요" selected={authorRole === "individual"} onSelect={() => setAuthorRole("individual")} />
              <ChoiceRow icon={Users} label="팀" description="팀 이름과 팀원을 적어요" selected={authorRole === "team"} onSelect={() => setAuthorRole("team")} />
              {/* 팀원이 소유자 프로젝트를 익명으로 바꾸면 팀원 목록이 비워져 자기 수정 권한도 사라진다 — 소유자(canDelete)만 */}
              <ChoiceRow
                icon={VenetianMask}
                label="익명"
                description="이름 없이 올려요"
                selected={authorRole === "anonymous"}
                onSelect={() => setAuthorRole("anonymous")}
                disabled={isEdit && !canDelete && authorRole !== "anonymous"}
                disabledReason="프로젝트 주인만 익명으로 바꿀 수 있어요"
              />
            </div>
            {authorRole === "anonymous" && (
              <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                다른 사람에게는 만든 사람이 &lsquo;익명&rsquo;으로 보이고, 내 프로필과 이름 검색에는 나오지 않아요. 수정·삭제는 지금처럼 나만 할 수 있어요. 사이트 관리자는 누가 만들었는지 볼 수 있어요.
                설명·저장소 링크·사이트에 이름이나 GitHub 아이디가 있으면 거기서는 알 수 있어요.
              </p>
            )}
          </div>

          {authorRole === "team" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2" id="team_name_section">
                <Label htmlFor="team_name" className="text-[13px] font-semibold text-zinc-900 dark:text-white">팀 이름<span className="ml-0.5 text-rose-600" aria-hidden>*</span></Label>
                <Input id="team_name" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="팀 이름을 입력하세요" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-900 dark:text-white">팀 아이콘 <span className="font-medium text-zinc-500 dark:text-zinc-400">(선택)</span></Label>
                <p className="text-[13px] text-zinc-600 dark:text-zinc-400">팀 이름 옆 동그라미에 보여요. 안 올리면 팀 이름 첫 글자가 나와요.</p>
                <ImageUploadInput value={teamIconUrl} onChange={setTeamIconUrl} shape="circle" previewSize="sm" />
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
                    aria-label="팀원 추가"
                    className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-xl px-4")}
                  >
                    {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Plus className="w-4 h-4" aria-hidden />}
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
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              name.charAt(0)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">{name}</div>
                            <div className="text-xs text-zinc-500 truncate">{email}{isMe && " · 나"}</div>
                          </div>
                          {!isMe && (
                            <button type="button" onClick={() => removeTeamMember(email)} aria-label={`팀원 ${name} 빼기`} className="text-zinc-400 hover:text-red-500 rounded-full p-0.5 shrink-0">
                              <X className="w-3.5 h-3.5" aria-hidden />
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

        {/* 6. 홍보 포스터(선택) — 수정 화면만: 지금 상태 + 옆 칸(PosterSheet)을 여는 버튼 하나.
            새 등록에선 안 보인다 — 포스터는 저장된 프로젝트가 있어야 올리고 AI로 만들 수 있어서(2026-11-07 사용자 요청) */}
        {isEdit && initialData?.id && (
          <FormSection id="section-poster" title="홍보 포스터" hint="선택">
            {initialData.visibility === "public" ? (
              <div className="flex items-center gap-4">
                {initialData.poster_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary 원본
                  <img src={posterImageAt(initialData.poster_image_url, 240)} alt="지금 걸린 포스터" className="h-24 w-auto shrink-0 rounded-lg ring-1 ring-zinc-200 dark:ring-zinc-800" />
                ) : (
                  <div className="flex aspect-[210/297] h-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700" aria-hidden>
                    <Megaphone className="h-5 w-5" />
                  </div>
                )}
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {initialData.poster_image_url ? "상세 페이지에 걸린 포스터예요" : "아직 걸린 포스터가 없어요"}
                  </p>
                  <p className={hintClass}>AI로 만들거나 직접 만든 그림을 올려서 걸 수 있어요.</p>
                  <button
                    type="button"
                    onClick={() => openPosterSheet()}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-full px-4")}
                  >
                    <Megaphone className="mr-1.5 h-4 w-4" aria-hidden /> {initialData.poster_image_url ? "포스터 바꾸기" : "홍보 포스터 만들기"}
                  </button>
                </div>
              </div>
            ) : (
              <p className={hintClass}>공개 프로젝트만 포스터를 걸 수 있어요.</p>
            )}
          </FormSection>
        )}

        {/* 7. 위험 구역 — 수정 페이지, 소유자만 */}
        {showDanger && (
          <FormSection id="section-danger" title="위험 구역" hint="수정 페이지에서만" danger>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">삭제하면 댓글·하트까지 함께 사라지고 되돌릴 수 없어요.</p>
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

        {ban.banned && <BannedNotice until={ban.until} />}
        <div className="flex items-center justify-end gap-2.5 pb-6 pt-1">
          <button type="button" onClick={() => router.back()} className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 rounded-full px-4 text-sm")}>
            취소
          </button>
          <button
            type="submit"
            disabled={isLoading || ban.banned || shortDesc.length > 100}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 rounded-full px-5 text-sm transition-[background-color,scale] active:scale-[0.96]",
              SECTION_COLORS.new.button,
              (isLoading || ban.banned || shortDesc.length > 100) && "cursor-not-allowed opacity-50",
            )}
          >
            {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Rocket className="mr-1.5 h-4 w-4" aria-hidden />}
            {isEdit ? "저장하기" : "등록하기"}
          </button>
        </div>
      </form>

      <FormRail sections={railSections} requiredDone={requiredDone} requiredTotal={requiredFlags.length} className="sticky top-24 hidden w-[200px] shrink-0 lg:grid" />

      <Dialog open={domainOffer !== null} onOpenChange={(open) => { if (!open) finishDomainOffer(false); }}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">등록했어요! 짧은 주소도 받을까요?</DialogTitle>
            <DialogDescription>
              {domainOffer?.hostLabel} 무료 주소 대신 <span className="font-mono">이름.dshs.dev</span>로 사이트를 알릴 수 있어요.
              {domainOffer?.quick ? " 호스트에서 할 일이 없어서 2분이면 끝나요." : " 호스트 설정에 주소 하나만 넣으면 돼요."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="grid gap-0.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">지금</span>
              <span className="break-all font-mono text-zinc-500 dark:text-zinc-400">{domainOffer?.hostname}</span>
            </div>
            <div className="grid gap-0.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">받으면</span>
              <span className="break-all font-mono font-semibold text-zinc-900 dark:text-white">{domainOffer?.suggestion ?? "이름"}.dshs.dev</span>
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => finishDomainOffer(false)} className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}>
              나중에
            </button>
            <button type="button" onClick={() => finishDomainOffer(true)} className={cn(buttonVariants(), "rounded-xl", SECTION_COLORS.domains.button)}>
              도메인 마련하기
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showPrivateDialog}
        onOpenChange={(open) => {
          setShowPrivateDialog(open);
          if (!open) {
            setCloseOnly(false);
            setConfirmName("");
          }
        }}
      >
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">{closeOnly ? "이 주소를 닫을까요?" : "비공개로 바꾸면 주소도 닫혀요"}</DialogTitle>
            <DialogDescription>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{subdomainName}.dshs.dev</span> 주소를 반납해요.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>이 주소로는 더 이상 사이트가 열리지 않아요.</li>
            <li>이름이 풀려서 다른 사람이 바로 가져갈 수 있어요.</li>
            <li>방문 주소가 이 주소였다면 도메인을 받기 전 주소로 돌아가요. 기억된 주소가 없으면 비워져요.</li>
            <li>다시 공개로 바꿔도 주소는 돌아오지 않아요. 도메인 마련하기에서 새로 받아야 해요.</li>
          </ul>
          <ConfirmNameInput name={savedTitle} value={confirmName} onChange={setConfirmName} />
          <DialogFooter>
            <button
              type="button"
              onClick={() => { setShowPrivateDialog(false); setCloseOnly(false); setConfirmName(""); }}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              취소
            </button>
            <button
              type="button"
              disabled={!confirmed}
              onClick={() => {
                setShowPrivateDialog(false);
                setConfirmName("");
                if (closeOnly) {
                  setCloseOnly(false);
                  void closeDomainNow();
                } else {
                  void saveProject();
                }
              }}
              className={cn(buttonVariants(), "rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50")}
            >
              {closeOnly ? "주소 반납" : "비공개로 바꾸고 주소 반납"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReadmeDialog} onOpenChange={(open) => { if (!open && !readmeLoading) setShowReadmeDialog(false); }}>
        <DialogContent showCloseButton={false} className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">GitHub README 가져오기</DialogTitle>
            <DialogDescription>
              저장소의 README로 상세 설명을 채워요. 저장소 링크는 아래 ‘소스코드’ 칸에도 같이 들어가요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid min-w-0 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="readme_url" className={labelClass}>저장소 링크</Label>
              <div className="relative">
                <Code2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <Input
                  id="readme_url"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); requestReadme(); } }}
                  placeholder="https://github.com/username/repo"
                  className="h-11 min-w-0 rounded-xl pl-9"
                />
              </div>
              {readmeError && (
                <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">{readmeError}</p>
              )}
            </div>
            <ChoiceRow
              selected={sourceType === "open" && readmeSyncChoice}
              onSelect={() => setReadmeSyncChoice(v => !v)}
              icon={RefreshCw}
              label="README와 자동 동기화"
              description="README를 고치면 다음 날 밤 상세 설명도 따라 바뀌어요. 켜 두면 여기서는 설명을 고칠 수 없어요."
              disabled={sourceType !== "open" || readmeLoading}
              disabledReason={sourceType !== "open" ? "소스코드 공개를 ‘오픈소스’로 고르면 쓸 수 있어요." : null}
            />
            {description.trim() && !readmeSync && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                지금 상세 설명에 적은 내용이 README로 바뀌어요. 되돌릴 수 없어요.
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowReadmeDialog(false)}
              disabled={readmeLoading}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
            >
              취소
            </button>
            <button
              type="button"
              onClick={requestReadme}
              disabled={readmeLoading}
              className={cn(buttonVariants(), "rounded-xl", readmeLoading && "cursor-not-allowed opacity-50")}
            >
              {readmeLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <Download className="mr-1.5 h-4 w-4" aria-hidden />}
              {readmeLoading ? "가져오는 중…" : "가져오기"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showDanger && (
        <Dialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            if (isDeleting) return;
            setShowDeleteDialog(open);
            if (!open) {
              setConfirmName("");
              setDeleteError("");
            }
          }}
        >
          <DialogContent showCloseButton={false} className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">정말 삭제하시겠습니까?</DialogTitle>
              <DialogDescription>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{initialData?.title}</span> 프로젝트와 모든 관련 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                {subdomainName && (
                  <span className="mt-2 block">
                    이 프로젝트의 주소 <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{subdomainName}.dshs.dev</span>도 반납돼요.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <ConfirmNameInput name={savedTitle} value={confirmName} onChange={setConfirmName} disabled={isDeleting} />
            {deleteError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setConfirmName("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || !confirmed}
                className={cn(
                  buttonVariants(),
                  "rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center disabled:opacity-50",
                  isDeleting && "cursor-not-allowed"
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
