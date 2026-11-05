import { Bone, HeroSkeleton, SkeletonPage } from "@/components/shared/page-skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <HeroSkeleton />
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-9">
        <div>
          <Bone className="mb-3 h-7 w-36" />
          <Bone className="h-20 w-full rounded-3xl" />
        </div>
        <div>
          <Bone className="mb-3 h-7 w-28" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Bone key={i} className="h-[92px] rounded-2xl" />
            ))}
          </div>
        </div>
        <div>
          <Bone className="mb-3 h-7 w-24" />
          <Bone className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    </SkeletonPage>
  );
}
