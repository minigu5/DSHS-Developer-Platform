"use client";

import { useEffect, useRef, useState } from "react";
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
import { ChevronRight, Rocket } from "lucide-react";
import { ToggleChip } from "@/components/forms/toggle-chip";
import { AUTH_TITLE_CLASS, AUTH_LEAD_CLASS, riseDelay } from "@/components/auth/auth-shell";
import { cn } from "@/lib/utils";
import { SECTION_COLORS } from "@/lib/section-colors";

const onboardingSchema = z.object({
  nickname: z.string().min(2, "닉네임은 2자 이상이어야 합니다.").max(20, "닉네임은 20자 이하이어야 합니다."),
  interests: z.array(z.string()),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm({ user }: { user: User }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // 단계가 바뀌면 누른 버튼이 사라지므로 새 제목으로 포커스를 옮긴다(첫 화면은 그대로)
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    titleRef.current?.focus();
  }, [step]);

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

  const email = user.email ?? "";
  const initial = (email.charAt(0) || "?").toUpperCase();

  return (
    <>
      <span
        className="rise mt-[22px] inline-flex h-[26px] items-center rounded-full bg-blue-50 px-[11px] text-xs font-semibold text-blue-700 tabular-nums dark:bg-blue-950 dark:text-blue-300"
        style={riseDelay(60)}
      >
        {step} / 2단계
      </span>
      <h1 ref={titleRef} tabIndex={-1} className={cn(AUTH_TITLE_CLASS, "mt-3 outline-none sm:mt-3 sm:text-[40px]")} style={riseDelay(90)}>
        {step === 1 ? "닉네임 정하기" : "관심 분야 고르기"}
      </h1>
      <p className={AUTH_LEAD_CLASS} style={riseDelay(120)}>
        {step === 1 ? "사이트에서 내 이름 대신 보일 닉네임이에요. 나중에 바꿀 수 있어요." : "관심 있는 분야나 과목을 골라 주세요. 고르지 않고 시작해도 괜찮아요."}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="flex w-full flex-col items-center">
        {step === 1 && (
          <div className="rise mt-7 w-full max-w-[460px] text-left animate-in fade-in duration-200" style={riseDelay(180)}>
            <Label htmlFor="nickname" className="text-[13px] font-semibold text-zinc-900 dark:text-white">닉네임</Label>
            <Input
              id="nickname"
              placeholder="예: 대곽개발자"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!form.formState.errors.nickname}
              aria-describedby={form.formState.errors.nickname ? "nickname-error" : "nickname-hint"}
              className="mt-1.5 h-11 rounded-xl"
              {...form.register("nickname")}
            />
            {form.formState.errors.nickname ? (
              <p id="nickname-error" role="alert" className="mt-1.5 text-[13px] text-rose-600 dark:text-rose-400">{form.formState.errors.nickname.message}</p>
            ) : (
              <p id="nickname-hint" className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">2~20자. 나중에 프로필에서 바꿀 수 있어요.</p>
            )}
            <Button
              type="button"
              onClick={nextStep}
              disabled={loading}
              className={cn("mt-[26px] h-11 w-full rounded-full text-sm", SECTION_COLORS.explore.button)}
            >
              {loading ? "확인 중…" : "다음"}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="w-full animate-in fade-in duration-200">
            <div className="rise mx-auto mt-[26px] flex max-w-[520px] flex-wrap justify-center gap-2" style={riseDelay(180)} role="group" aria-label="관심 분야">
              {INTERESTS.map((interest) => (
                <ToggleChip
                  key={interest.value}
                  pressed={selectedInterests.includes(interest.value)}
                  onToggle={() => toggleInterest(interest.value)}
                  label={interest.label}
                />
              ))}
            </div>
            <p className="rise mt-3 text-xs text-zinc-500 dark:text-zinc-400" style={riseDelay(200)}>
              고른 관심 분야는 프로필 페이지에 공개돼요.
            </p>
            {form.formState.errors.interests && (
              <p className="mt-1.5 text-[13px] text-rose-600 dark:text-rose-400">{form.formState.errors.interests.message}</p>
            )}
            <div className="rise mx-auto mt-[26px] flex w-full max-w-[460px] items-center justify-between gap-2.5" style={riseDelay(220)}>
              <Button type="button" variant="ghost" onClick={() => setStep(1)} className="h-11 rounded-full px-4 text-sm">
                이전
              </Button>
              <Button type="submit" disabled={loading} className={cn("h-11 rounded-full px-5 text-sm", SECTION_COLORS.explore.button)}>
                <Rocket className="mr-1.5 h-4 w-4" aria-hidden />
                {loading ? "저장 중…" : "시작하기"}
              </Button>
            </div>
          </div>
        )}
      </form>

      <span
        className="rise mt-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-1 pl-1.5 pr-3 text-[13px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
        style={riseDelay(260)}
      >
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" aria-hidden>
          {initial}
        </span>
        {email}로 로그인했어요
      </span>
    </>
  );
}
