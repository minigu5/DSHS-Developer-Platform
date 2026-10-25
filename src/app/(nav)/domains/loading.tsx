import { Bone, HeroSkeleton, SkeletonPage } from "@/components/shared/page-skeleton";

// /domains 와 /domains/admin 공통 — 머리 + 줄 목록
export default function Loading() {
  return (
    <SkeletonPage>
      <HeroSkeleton />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <div className="mb-4 flex items-center justify-between">
          <Bone className="h-5 w-40" />
          <Bone className="h-4 w-16" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} className="h-[68px] w-full rounded-2xl" />
          ))}
        </div>
      </main>
    </SkeletonPage>
  );
}
