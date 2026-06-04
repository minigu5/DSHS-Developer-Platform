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
import { Checkbox } from "@/components/ui/checkbox";
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
        toast.success("환영합니다! 프로필 설정이 완료되었습니다.");
        // 닉네임 업데이트 후 캐시 반영을 위해 refresh 후 이동
        router.refresh();
        setTimeout(() => {
          router.push("/");
        }, 500); // 넉넉하게 500ms 대기
      }
    } catch (err) {
      setLoading(false);
      toast.error("프로필 저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <Card className="border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
      <CardHeader className="space-y-1 pb-8">
        <div className="w-12 h-1 bg-blue-500 rounded-full mb-4" />
        <CardTitle className="text-2xl font-bold tracking-tight text-white">
          {step === 1 ? "거의 다 왔어요!" : "당신을 더 알려주세요"}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {step === 1 ? "플랫폼에서 사용할 멋진 닉네임을 정해주세요." : "관심 있는 분야나 과목을 선택해주세요."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form 
          onSubmit={form.handleSubmit(onSubmit)} 
          onKeyDown={handleKeyDown}
          className="space-y-6"
        >
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-zinc-300">닉네임</Label>
                <Input
                  id="nickname"
                  placeholder="예: 대곽개발자"
                  autoComplete="off"
                  className="bg-zinc-800/50 border-zinc-700 text-white h-12 rounded-xl focus:ring-blue-500/20"
                  {...form.register("nickname")}
                />
                {form.formState.errors.nickname && (
                  <p className="text-sm text-red-400 mt-1">{form.formState.errors.nickname.message}</p>
                )}
              </div>
              <div className="pt-2 p-1 -m-1">
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all"
                >
                  {loading ? "확인 중..." : "다음으로"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-2 -m-2 custom-scrollbar">
                {INTERESTS.map((interest) => (
                  <div 
                    key={interest.value}
                    className={`flex items-center space-x-2 p-3 rounded-xl border transition-all duration-200 ease-out cursor-pointer select-none will-change-transform hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] active:duration-75 ${
                      form.watch("interests").includes(interest.value)
                        ? "bg-blue-600/20 border-blue-500/50 text-white shadow-md shadow-blue-500/10"
                        : "bg-zinc-800/30 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20"
                    }`}
                    onClick={() => {
                      const current = form.getValues("interests");
                      if (current.includes(interest.value)) {
                        form.setValue("interests", current.filter(v => v !== interest.value));
                      } else {
                        form.setValue("interests", [...current, interest.value]);
                      }
                      form.trigger("interests");
                    }}
                  >
                    <Checkbox
                      id={interest.value}
                      checked={form.watch("interests").includes(interest.value)}
                      onCheckedChange={(checked) => {
                        const current = form.getValues("interests");
                        if (checked) {
                          form.setValue("interests", [...current, interest.value]);
                        } else {
                          form.setValue("interests", current.filter(v => v !== interest.value));
                        }
                        form.trigger("interests");
                      }}
                      className="hidden"
                    />
                    <span className="text-sm font-medium">{interest.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 text-center bg-zinc-800/20 py-2 rounded-lg border border-zinc-800/30">
                💡 선택하신 관심 분야는 프로필 페이지에 공개됩니다.
              </p>
              {form.formState.errors.interests && (
                <p className="text-sm text-red-400">{form.formState.errors.interests.message}</p>
              )}
              <div className="flex gap-3 pt-2 p-1 -m-1">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-xl"
                >
                  이전
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-[2] h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all"
                >
                  {loading ? "처리 중..." : "시작하기"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
