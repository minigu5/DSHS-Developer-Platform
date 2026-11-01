// 마지막으로 보던 가이드 기록 — 위저드(/guide)에서 "이어서 보기"를 띄우는 데 쓴다.
// 브라우저 localStorage 에만 둔다(개인정보 처리방침의 "가이드에서 읽던 위치를 기억해요" 범위).
// 단계 번호 자체는 가이드마다 `guide-progress:<경로>`에 따로 있고, 이 기록은 어느 가이드였는지와 보여 줄 문구만 쥔다.

export const GUIDE_RESUME_KEY = "guide-last";

export type GuideResume = {
  /** 가이드 주소 (/guide/...) */
  path: string;
  /** 가이드 제목 (planGuide().title) */
  title: string;
  /** 0부터 센 전체 단계 위치 */
  step: number;
  total: number;
  chapterNo: number;
  chapterName: string;
  /** 장 안에서 몇 번째 단계인지 (1부터) */
  inChapter: number;
  stepTitle: string;
  /** 마지막으로 본 시각 (ms) */
  at: number;
};

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

/** 저장된 문자열을 읽는다. 모양이 이상하면(다른 사이트 값·옛 형식·손으로 고친 값) null */
export function parseGuideResume(raw: string | null): GuideResume | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  // 주소는 우리 가이드 경로만 — 링크로 그대로 쓰므로 바깥 주소·`//` 를 받지 않는다
  if (!isText(r.path, 300) || !/^\/guide\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(r.path)) return null;
  if (!isText(r.title, 200) || !isText(r.chapterName, 100) || typeof r.stepTitle !== "string" || r.stepTitle.length > 200) return null;
  if (!isInt(r.step) || !isInt(r.total) || !isInt(r.chapterNo) || !isInt(r.inChapter) || !isInt(r.at)) return null;
  if (r.total < 1 || r.step < 0 || r.step >= r.total || r.inChapter < 1) return null;
  return {
    path: r.path,
    title: r.title,
    step: r.step,
    total: r.total,
    chapterNo: r.chapterNo,
    chapterName: r.chapterName,
    inChapter: r.inChapter,
    stepTitle: r.stepTitle,
    at: r.at,
  };
}

/** 이어서 볼 게 남았는지 — 마지막 단계까지 갔으면 다 본 것으로 친다 */
export function hasMoreToRead(r: GuideResume): boolean {
  return r.step < r.total - 1;
}
