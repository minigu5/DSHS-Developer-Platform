import Link from "@/components/shared/link";
import { Megaphone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 보일지는 상세 페이지가 서버에서 판단한다(canEdit · 공개 · posterAllowed). */
export function PosterButton({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/poster`}
      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 w-full rounded-full px-4 text-sm text-zinc-700 sm:w-auto dark:text-zinc-300")}
    >
      <Megaphone className="mr-1.5 h-4 w-4" aria-hidden /> 포스터 만들기
    </Link>
  );
}
