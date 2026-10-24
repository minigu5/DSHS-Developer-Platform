// 가이드 조각 읽기 (server 전용).
// 조각 = 장 하나 분량의 마크다운 파일 src/content/guides/<key>.md.
// 여러 답 조합이 같은 조각을 함께 쓴다. 어떤 조합이 어떤 조각을 쓰는지는 planGuide()가 정한다.
// 파일 안에서는 '---' 한 줄로 단계를 나눈다. 작성법: src/content/guides/README.md
// 운영(Cloudflare Workers)은 파일 시스템이 없어 빌드 때 묶은 fragments.generated.ts를 읽고,
// 개발에서는 md를 고치면 바로 보이도록 파일을 직접 읽는다.

import { GUIDE_FRAGMENTS } from "@/content/guides/fragments.generated";
import {
  FRAGMENT_TITLES,
  allGuideAnswers,
  buildSlug,
  planGuide,
  visibleSteps,
  type GuideAnswers,
  type GuideChapterPlan,
  type GuidePlan,
} from "@/lib/guide";
import { splitFragmentSteps } from "@/lib/guide-markup";
import { getDocMeta, getLatestDoc } from "@/lib/guide-wiki/read";

const KEY_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

async function readFragmentSource(key: string): Promise<string | null> {
  if (process.env.NODE_ENV === "development") {
    const [{ readFile }, path] = await Promise.all([import("fs/promises"), import("path")]);
    try {
      return await readFile(path.join(process.cwd(), "src", "content", "guides", `${key}.md`), "utf-8");
    } catch {
      return null;
    }
  }
  return Object.hasOwn(GUIDE_FRAGMENTS, key) ? GUIDE_FRAGMENTS[key] : null;
}

export type GuideFragmentStep = { id: string; body: string };

/** 위키 편집 기능의 WikiDoc과 같은 모양 */
export type GuideFragment = {
  key: string;
  title: string;
  steps: GuideFragmentStep[];
  extra: null;
};

export async function getFragment(key: string): Promise<GuideFragment | null> {
  if (!KEY_RE.test(key)) return null;
  const md = await readFragmentSource(key);
  if (md === null) return null;
  return {
    key,
    title: FRAGMENT_TITLES[key] ?? key,
    steps: splitFragmentSteps(md).map((body, i) => ({ id: `s${i + 1}`, body })),
    extra: null,
  };
}

function answersLabel(a: GuideAnswers): string {
  return visibleSteps(a)
    .map((s) => s.options.find((o) => o.value === a[s.key])?.label ?? a[s.key])
    .join(" · ");
}

/** 이 조각을 쓰는 모든 가이드 ("이 내용은 가이드 N곳에 함께 쓰여요") */
export async function listUsages(key: string): Promise<{ label: string; href: string }[]> {
  return allGuideAnswers()
    .filter((a) => planGuide(a).chapters.some((c) => c.key === key))
    .map((a) => ({ label: answersLabel(a), href: `/guide/${buildSlug(a)}` }));
}

/** 장 이름 줄 오른쪽 "마지막으로 ○○님이 고침" — DB 기록이 없으면 null */
export type ChapterMeta = {
  latestRev: number;
  lastAuthor: { id: string | null; nickname: string } | null;
  lastAt: string | null;
  contributors: number;
};

export type LoadedChapter = GuideChapterPlan & { steps: GuideFragmentStep[]; meta: ChapterMeta | null };

// 위키 편집본(DB 최신 ?? 저장소 원본)과 그 메타를 읽는다. 가이드는 읽기 전용 화면이라
// DB가 잠시 안 되면 저장소 원본으로 보여 준다(편집기는 반대로 오류를 내 덮어쓰기를 막는다).
async function loadChapterDoc(key: string): Promise<{ steps: GuideFragmentStep[]; meta: ChapterMeta | null } | null> {
  try {
    const [latest, meta] = await Promise.all([getLatestDoc(key), getDocMeta(key)]);
    return latest ? { steps: latest.doc.steps, meta } : null;
  } catch (e) {
    console.error("[guide] 위키 편집본을 읽지 못해 저장소 원본을 씀", key, e);
    const fragment = await getFragment(key);
    return fragment ? { steps: fragment.steps, meta: null } : null;
  }
}

export async function loadGuide(
  answers: GuideAnswers,
): Promise<{ plan: GuidePlan; chapters: LoadedChapter[] }> {
  const plan = planGuide(answers);
  const chapters = await Promise.all(
    plan.chapters.map(async (c) => {
      const loaded = await loadChapterDoc(c.key);
      return loaded && loaded.steps.length ? { ...c, ...loaded } : null;
    }),
  );
  return { plan, chapters: chapters.filter((c): c is LoadedChapter => c !== null) };
}
