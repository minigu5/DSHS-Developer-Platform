// 가이드 조각 파일 읽기 (server 전용: fs 사용).
// 조각 = 장 하나 분량의 마크다운 파일 src/content/guides/<key>.md.
// 여러 답 조합이 같은 조각을 함께 쓴다. 어떤 조합이 어떤 조각을 쓰는지는 planGuide()가 정한다.
// 파일 안에서는 '---' 한 줄로 단계를 나눈다. 작성법: src/content/guides/README.md

import { promises as fs } from "fs";
import path from "path";

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

const GUIDES_DIR = path.join(process.cwd(), "src", "content", "guides");
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

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
  let md: string;
  try {
    md = await fs.readFile(path.join(GUIDES_DIR, `${key}.md`), "utf-8");
  } catch {
    return null;
  }
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

export type LoadedChapter = GuideChapterPlan & { steps: GuideFragmentStep[] };

export async function loadGuide(
  answers: GuideAnswers,
): Promise<{ plan: GuidePlan; chapters: LoadedChapter[] }> {
  const plan = planGuide(answers);
  const chapters = await Promise.all(
    plan.chapters.map(async (c) => {
      // 위키 편집 기능(guide-wiki)이 들어오면 getFragment 대신 getLatestDoc(DB 최신 ?? 원본)을 쓴다.
      const fragment = await getFragment(c.key);
      return fragment && fragment.steps.length ? { ...c, steps: fragment.steps } : null;
    }),
  );
  return { plan, chapters: chapters.filter((c): c is LoadedChapter => c !== null) };
}
