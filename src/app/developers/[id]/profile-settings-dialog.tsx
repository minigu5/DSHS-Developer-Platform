"use client";
import { INTERESTS } from "@/lib/constants";

import { useState } from "react";
import { toast } from "sonner";
import { Settings, Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateProfile, checkNicknameDuplicate } from "../actions";

interface ProfileSettingsDialogProps {
  userId: string;
  initialNickname: string;
  initialBio: string;
  initialAvatar: string;
  initialInterests: string[];
  fullName: string;
}

export function ProfileSettingsDialog({ userId, initialNickname, initialBio, initialAvatar, initialInterests, fullName }: ProfileSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState(initialNickname);
  const [bio, setBio] = useState(initialBio);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [loading, setLoading] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(true);
  
  const router = useRouter();

  const handleNicknameChange = (val: string) => {
    setNickname(val);
    if (val === initialNickname) {
      setIsNicknameChecked(true);
    } else {
      setIsNicknameChecked(false);
    }
  };

  const handleCheckDuplicate = async () => {
    if (!nickname || nickname.trim() === "") {
      toast.error("닉네임을 입력해주세요.");
      return;
    }
    if (nickname === initialNickname) {
      setIsNicknameChecked(true);
      return;
    }

    setCheckingNickname(true);
    try {
      const { isDuplicate, error } = await checkNicknameDuplicate(nickname, userId);
      if (error) throw new Error(error);
      
      if (isDuplicate) {
        toast.error("이미 사용 중인 닉네임입니다.");
        setIsNicknameChecked(false);
      } else {
        toast.success("사용 가능한 닉네임입니다.");
        setIsNicknameChecked(true);
      }
    } catch (err: any) {
      toast.error(`중복 확인 실패: ${err.message}`);
    } finally {
      setCheckingNickname(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isNicknameChecked) {
      toast.error("닉네임 중복 확인을 해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await updateProfile({ nickname, bio, avatar_url: avatar, interests });
      if (res.error) {
        throw new Error(res.error);
      }
      toast.success("프로필이 성공적으로 업데이트되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(`프로필 업데이트에 실패했습니다. (${err.message || err})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button onClick={() => setOpen(true)} className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center">
        <Settings className="w-4 h-4 mr-2" />
        프로필 설정
      </button>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle>프로필 설정</DialogTitle>
          <DialogDescription>
            다른 사용자에게 표시될 이름과 아바타를 수정합니다.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">이름 (수정 불가)</label>
            <input
              value={fullName}
              disabled
              className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">닉네임</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  placeholder="예: Astroboy"
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isNicknameChecked && nickname !== "" && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleCheckDuplicate}
                disabled={checkingNickname || isNicknameChecked}
              >
                {checkingNickname ? <Loader2 className="w-4 h-4 animate-spin" /> : "중복 확인"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">자기소개</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="자신을 짧게 소개해주세요"
              rows={3}
              className="flex w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="avatar" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">아바타 URL</label>
            <input
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">관심 분야</label>
            <div className="flex flex-wrap gap-2 p-1 -m-1">
              {INTERESTS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    if (interests.includes(item.value)) {
                      setInterests(interests.filter(v => v !== item.value));
                    } else {
                      setInterests([...interests, item.value]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ease-out select-none will-change-transform hover:scale-105 hover:brightness-110 active:scale-95 active:duration-75 ${
                    interests.includes(item.value)
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:shadow-lg"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading || !isNicknameChecked} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
