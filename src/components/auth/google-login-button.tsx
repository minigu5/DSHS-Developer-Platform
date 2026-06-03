'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { ALLOWED_EMAIL_DOMAIN } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

interface GoogleLoginButtonProps {
  next?: string;
}

export function GoogleLoginButton({ next }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectTo = new URL('/auth/callback', window.location.origin);
      if (next) redirectTo.searchParams.set('next', next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
          // Google측 1차 도메인 힌트(Workspace 일 때 유효). 진짜 검증은 서버에서.
          queryParams: {
            hd: ALLOWED_EMAIL_DOMAIN,
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        toast.error('로그인 시작에 실패했어요', {
          description: error.message,
        });
        setLoading(false);
      }
      // 성공하면 브라우저가 Google로 리다이렉트되므로 loading 해제 불필요
    } catch (err) {
      toast.error('알 수 없는 오류가 발생했어요');
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleSignIn}
      disabled={loading}
      variant="outline"
      size="lg"
      className="w-full"
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      Google 계정으로 로그인
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}
