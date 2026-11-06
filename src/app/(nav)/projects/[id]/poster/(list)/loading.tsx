import { CardGridSkeleton, HeroSkeleton, SkeletonPage } from "@/components/shared/page-skeleton";

export default function Loading() {
  return (
    <SkeletonPage>
      <HeroSkeleton variant="compact" actions={1} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-9">
        <CardGridSkeleton count={3} />
      </main>
    </SkeletonPage>
  );
}
