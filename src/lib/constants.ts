// 프로젝트 체크리스트 옵션. 게시 폼 / 필터링에서 공통으로 import.
// 값 추가 시 RLS / DB constraint 와 함께 검토할 것.

export const PROJECT_TYPES = [
  { value: 'website', label: '웹사이트' },
  { value: 'app', label: '응용프로그램(App)' },
  { value: 'extension', label: '확장프로그램' },
  { value: 'cli', label: 'CLI / 스크립트' },
  { value: 'library', label: '라이브러리 / 패키지' },
] as const;

export const PLATFORMS = [
  { value: 'web', label: 'Web' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
] as const;

export const SOURCE_TYPES = [
  { value: 'open', label: 'Open Source' },
  { value: 'closed', label: 'Closed Source' },
] as const;

export const LICENSE_FEATURES = [
  { value: 'commercial', label: '상업적 이용' },
  { value: 'modify', label: '수정' },
  { value: 'distribute', label: '배포' },
  { value: 'private', label: '개인적 이용' },
  { value: 'liability', label: '법적 책임' },
  { value: 'warranty', label: '보증' },
] as const;

export const FEATURES = [
  { value: 'document', label: '문서 편집' },
  { value: 'ai', label: 'AI 활용' },
  { value: 'study', label: '학습 도구' },
  { value: 'utility', label: '유틸리티' },
  { value: 'game', label: '게임' },
  { value: 'social', label: '소셜 / 커뮤니티' },
  { value: 'media', label: '미디어 / 콘텐츠' },
  { value: 'productivity', label: '생산성' },
  { value: 'dev-tool', label: '개발자 도구' },
  { value: 'other', label: '기타' },
] as const;

export const VISIBILITY = [
  { value: 'public', label: '공개 (Public)' },
  { value: 'private', label: '비공개 (Private)' },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]['value'];
export type Platform = (typeof PLATFORMS)[number]['value'];
export type SourceType = (typeof SOURCE_TYPES)[number]['value'];
export type LicenseFeature = (typeof LICENSE_FEATURES)[number]['value'];
export type Feature = (typeof FEATURES)[number]['value'];
export type Visibility = (typeof VISIBILITY)[number]['value'];

export const INTERESTS = [
  { value: 'math', label: '수학' },
  { value: 'physics', label: '물리' },
  { value: 'chemistry', label: '화학' },
  { value: 'biology', label: '생명과학' },
  { value: 'earth-science', label: '지구과학' },
  { value: 'informatics', label: '정보 / 알고리즘' },
  { value: 'web', label: '웹 개발' },
  { value: 'app', label: '앱 개발' },
  { value: 'ai', label: '인공지능' },
  { value: 'game', label: '게임 개발' },
  { value: 'robotics', label: '로보틱스 / HW' },
  { value: 'security', label: '보안' },
  { value: 'design', label: '디자인 / UIUX' },
] as const;

export type Interest = (typeof INTERESTS)[number]['value'];

// ── 바이브 코딩 가이드 선택 옵션 ──
// /guide 위저드에서 사용. 슬러그 → 가이드 페이지 라우팅에 그대로 쓰이므로
// value 는 URL-safe 한 영소문자/하이픈만 사용할 것.

export const GUIDE_PROGRAM_TYPES = [
  { value: 'website', label: '웹사이트', desc: '주소만 있으면 폰·컴퓨터 어디서나 열려요' },
  { value: 'app', label: '앱', desc: '폰이나 컴퓨터에 설치해서 써요', chip: '' },
  { value: 'extension', label: '확장프로그램', desc: '크롬 같은 브라우저에 기능을 붙여요' },
  { value: 'tool', label: '그 밖의 도구', chip: '도구', desc: '터미널 명령어(CLI)나 다른 코드가 가져다 쓰는 라이브러리' },
] as const;

export const GUIDE_APP_PLATFORMS = [
  { value: 'android', label: 'Android', desc: '갤럭시 같은 안드로이드 폰', chip: 'Android 앱' },
  { value: 'apple', label: 'iPhone · iPad', desc: '아이폰, 아이패드', chip: 'iPhone·iPad 앱' },
  { value: 'mac', label: 'Mac', desc: '맥에 설치하는 프로그램', chip: 'Mac 앱' },
  { value: 'windows', label: 'Windows', desc: '윈도우에 설치하는 프로그램', chip: 'Windows 앱' },
] as const;

export const GUIDE_DATA = [
  { value: 'yes', label: '있어요', desc: '회원가입, 글쓰기, 점수 저장 같은 기능', chip: '로그인·저장 있음' },
  { value: 'no', label: '없어요', desc: '정해진 내용을 보여 주기만 해요', chip: '보여 주기만' },
  { value: 'unsure', label: '잘 모르겠어요', chip: '로그인은 나중에', desc: '없는 걸로 시작하고, 필요해지면 붙이는 법도 알려 줘요' },
] as const;

export const GUIDE_AI_TOOLS = [
  { value: 'claude', label: 'Claude', desc: 'Claude 앱의 Code 탭 · Pro 요금제부터' },
  { value: 'chatgpt', label: 'ChatGPT', desc: 'ChatGPT 앱의 Codex · 무료 요금제로도 시작할 수 있어요' },
  { value: 'gemini', label: 'Gemini', desc: 'Google Antigravity · 무료, 만 18세 이상' },
  { value: 'none', label: '아직 없어요', desc: '무료로 시작할 수 있는 걸로 골라 드려요', chip: 'AI 추천받기' },
] as const;

export const GUIDE_OS = [
  { value: 'windows', label: 'Windows', desc: '', chip: 'Windows 컴퓨터' },
  { value: 'mac', label: 'Mac', desc: '', chip: 'Mac 컴퓨터' },
] as const;

export type GuideProgramType = (typeof GUIDE_PROGRAM_TYPES)[number]['value'];
export type GuideAppPlatform = (typeof GUIDE_APP_PLATFORMS)[number]['value'];
export type GuideData = (typeof GUIDE_DATA)[number]['value'];
export type GuideAiTool = (typeof GUIDE_AI_TOOLS)[number]['value'];
export type GuideOs = (typeof GUIDE_OS)[number]['value'];

/** 실제로 1장(에이전트) 조각이 있는 AI. 'none'은 이 중 하나로 추천된다. */
export type GuideAgentAi = Exclude<GuideAiTool, 'none'>;

export const GUIDE_AI_LABELS: Record<GuideAgentAi, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  gemini: 'Gemini',
};

// ── 공지사항 카테고리 ──
export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'promotion', label: '홍보', desc: '프로젝트 홍보 및 소개' },
  { value: 'beta',      label: '베타테스트', desc: '베타 테스터 모집 및 피드백 요청' },
  { value: 'feedback',  label: '의견 수렴', desc: '기능/디자인 등 의견 요청' },
  { value: 'update',    label: '업데이트', desc: '프로젝트 업데이트 공지' },
  { value: 'general',   label: '일반', desc: '기타 일반 공지' },
] as const;

export const ADMIN_ANNOUNCEMENT_CATEGORY = {
  value: 'admin', label: '관리자', desc: '플랫폼 공식 안내',
} as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number]['value'];

// 허용 이메일 도메인 — middleware/RLS 와 같은 값을 사용해야 함.
export const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN ?? 'ts.hs.kr';

export function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

// 개발자(관리자) 계정 이메일 — 모든 프로젝트 열람 및 수정 권한 보유.
export const DEVELOPER_EMAIL = 'ts250024@ts.hs.kr';

export function isDeveloper(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
}
