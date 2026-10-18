"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { INTERESTS } from "@/lib/constants";
import { updateProfile, checkNicknameDuplicate } from "@/app/(nav)/developers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const onboardingSchema = z.object({
  nickname: z.string().min(2, "닉네임은 2자 이상이어야 합니다.").max(20, "닉네임은 20자 이하이어야 합니다."),
  interests: z.array(z.string()),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm({ user }: { user: User }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: "",
      interests: [],
    },
  });

  const selectedInterests = form.watch("interests");

  const toggleInterest = (value: string) => {
    const current = form.getValues("interests");
    form.setValue(
      "interests",
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
    form.trigger("interests");
  };

  const nextStep = async () => {
    if (step === 1) {
      const nickname = form.getValues("nickname");
      if (nickname.length < 2) {
        form.setError("nickname", { message: "닉네임은 2자 이상이어야 합니다." });
        return;
      }
      
      setLoading(true);
      const { isDuplicate, error } = await checkNicknameDuplicate(nickname, user.id);
      setLoading(false);

      if (error) {
        toast.error(error);
        return;
      }
      if (isDuplicate) {
        form.setError("nickname", { message: "이미 사용 중인 닉네임입니다." });
        return;
      }
      setStep(2);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === 1) {
      e.preventDefault();
      nextStep();
    }
  };

  const onSubmit = async (data: OnboardingValues) => {
    if (step === 1) return; // Prevent submission if accidentally triggered in step 1

    setLoading(true);
    try {
      const result = await updateProfile({
        nickname: data.nickname,
        bio: null,
        avatar_url: user.user_metadata.avatar_url || "",
        interests: data.interests,
      });

      if (result.error) {
        setLoading(false);
        toast.error(result.error);
      } else {
        toast.success("프로필을 저장했어요.");
        // 닉네임 업데이트 후 캐시 반영을 위해 refresh 후 이동
        router.refresh();
        setTimeout(() => {
          router.push("/");
        }, 500); // 넉넉하게 500ms 대기
      }
    } catch {
      setLoading(false);
      toast.error("프로필을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900 rounded-3xl overflow-hidden">
      <CardHeader className="space-y-1 pb-8">
        <p className="text-sm text-zinc-400">{step} / 2단계</p>
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          {step === 1 ? "닉네임 정하기" : "관심 분야 고르기"}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {step === 1 ? "사이트에서 내 이름 대신 보일 닉네임이에요. 나중에 바꿀 수 있어요." : "관심 있는 분야나 과목을 골라 주세요. 건너뛰어도 괜찮아요."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-zinc-300">닉네임</Label>
                <Input
                  id="nickname"
                  placeholder="예: 대곽개발자"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!form.formState.errors.nickname}
                  aria-describedby={form.formState.errors.nickname ? "nickname-error" : undefined}
                  className="bg-zinc-800 border-zinc-700 text-white h-12 rounded-xl"
                  {...form.register("nickname")}
                />
                {form.formState.errors.nickname && (
                  <p id="nickname-error" role="alert" className="text-sm text-red-400 mt-1">{form.formState.errors.nickname.message}</p>
                )}
              </div>
              <div className="pt-2 p-1 -m-1">
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  {loading ? "확인 중…" : "다음"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-2 -m-2 custom-scrollbar">
                {INTERESTS.map((interest) => {
                  const selected = selectedInterests.includes(interest.value);
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleInterest(interest.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors duration-150 select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                        selected
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : "bg-zinc-800/40 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      <Check className={`h-4 w-4 shrink-0 ${selected ? "text-blue-400" : "text-transparent"}`} aria-hidden />
                      <span className="text-sm font-medium">{interest.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-400 text-center">
                고른 관심 분야는 프로필 페이지에 공개돼요.
              </p>
              {form.formState.errors.interests && (
                <p className="text-sm text-red-400">{form.formState.errors.interests.message}</p>
              )}
              <div className="flex gap-3 pt-2 p-1 -m-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl"
                >
                  이전
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold"
                >
                  {loading ? "저장 중…" : "프로필 저장"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
