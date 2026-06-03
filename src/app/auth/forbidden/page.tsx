import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ALLOWED_EMAIL_DOMAIN } from '@/lib/constants';

export const metadata = {
  title: '접근 권한 없음 — DSHS Developer Platform',
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>접근이 거부되었습니다</CardTitle>
          <CardDescription>
            이 플랫폼은 <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> 도메인 계정만
            사용할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            대구과학고등학교 구성원이라면 학교에서 발급한 Google 계정으로 다시
            로그인해주세요.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Link href="/login" className={buttonVariants()}>
              로그인 화면으로
            </Link>

          </div>
        </CardContent>
      </Card>
    </main>
  );
}
