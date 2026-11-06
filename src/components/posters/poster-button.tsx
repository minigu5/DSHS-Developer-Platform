import Link from "@/components/shared/link";
import { Megaphone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 보일지는 상세 페이지가 서버에서 판단한다(canEdit · 공개). 띠 받기는 누구나, AI 포스터는 그 안에서 관리자만. */
export function PosterButton({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/poster`}
      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 w-full rounded-full px-4 text-sm text-zinc-700 sm:w-auto dark:text-zinc-300")}
    >
      <Megaphone className="mr-1.5 h-4 w-4" aria-hidden /> 홍보 포스터
    </Link>
  );
}
