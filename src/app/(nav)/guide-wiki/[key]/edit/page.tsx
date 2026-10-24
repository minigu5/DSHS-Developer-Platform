import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { safeFrom } from "@/lib/guide-wiki/params";
import { getLatestDoc, isSourceStale } from "@/lib/guide-wiki/read";
import { listUsages } from "@/lib/guide-wiki/source";
import { GuideWikiEditor } from "@/components/guide-wiki/editor/guide-wiki-editor";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "가이드 고치기 — DSHS Developer Platform",
};

interface EditPageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ [name: string]: string | string[] | undefined }>;
}

export default async function GuideWikiEditPage({ params, searchParams }: EditPageProps) {
  const { key } = await params;
  const { from } = await searchParams;

  const latest = await getLatestDoc(key);
  if (!latest) notFound();

  const [usages, stale] = await Promise.all([listUsages(key), isSourceStale(key)]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* 새 버전이 생기면(원본 가져오기 뒤 새로고침) 편집기를 새로 시작한다. */}
      <GuideWikiEditor
        key={latest.revNo}
        doc={latest.doc}
        baseRev={latest.revNo}
        usages={usages}
        stale={stale}
        from={safeFrom(from)}
      />
    </div>
  );
}
