import Link from "next/link";
import { Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 수정할 수 있는 사람(소유자·팀원·개발자 계정)인지는 상세 페이지가 서버에서 판단한다 — 익명 프로젝트는 브라우저가 소유자를 알 수 없어서. */
export function EditButton({ projectId }: { projectId: string }) {
  return (
    <Link
      href={`/projects/${projectId}/edit`}
      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-11 rounded-full px-4 text-sm text-zinc-700 dark:text-zinc-300")}
    >
      <Pencil className="mr-1.5 h-4 w-4" aria-hidden /> 수정하기
    </Link>
  );
}
