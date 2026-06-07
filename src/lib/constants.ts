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
  { value: 'website', label: '웹사이트', desc: '브라우저에서 동작하는 웹 서비스' },
  { value: 'app', label: '응용프로그램 / 앱', desc: '데스크톱 또는 모바일 앱' },
  { value: 'extension', label: '확장프로그램', desc: '브라우저·에디터 확장' },
  { value: 'cli', label: 'CLI / 스크립트', desc: '터미널에서 실행하는 도구' },
  { value: 'library', label: '라이브러리 / 패키지', desc: '다른 코드에서 가져다 쓰는 모듈' },
] as const;

export const GUIDE_APP_PLATFORMS = [
  { value: 'android', label: 'Android', desc: '구글 안드로이드 앱' },
  { value: 'ios', label: 'iOS', desc: '아이폰 앱' },
  { value: 'ipados', label: 'iPadOS', desc: '아이패드 앱' },
  { value: 'macos', label: 'macOS', desc: '맥 데스크톱 앱' },
  { value: 'windows', label: 'Windows', desc: '윈도우 데스크톱 앱' },
] as const;

export const GUIDE_TERMINAL = [
  { value: 'terminal', label: '터미널을 사용해요', desc: 'CLI 명령어 입력이 익숙해요' },
  { value: 'gui', label: '터미널은 어려워요', desc: 'GUI 위주로 작업하고 싶어요' },
] as const;

export const GUIDE_AI_TOOLS = [
  { value: 'chatgpt-codex', label: 'ChatGPT / Codex', desc: 'OpenAI 기반 코딩 도구' },
  { value: 'claude-code', label: 'Claude Code', desc: 'Anthropic 의 터미널 코딩 에이전트' },
  { value: 'gemini', label: 'Gemini', desc: 'Google 의 AI 코딩 도구' },
] as const;

export const GUIDE_OS = [
  { value: 'windows', label: 'Windows', desc: '' },
  { value: 'mac', label: 'macOS', desc: '' },
  { value: 'linux', label: 'Linux', desc: '' },
] as const;

export const GUIDE_ANDROID_GEMINI_TOOL = [
  { value: 'aistudio',    label: 'Google AI Studio',                   desc: '브라우저에서 바로 시작 — 단, 성인 인증된 Google 계정 필요' },
  { value: 'antigravity', label: 'Google Antigravity + Android Studio', desc: '설치형 IDE, 더 강력한 개발 환경 (무료)' },
] as const;

export type GuideProgramType = (typeof GUIDE_PROGRAM_TYPES)[number]['value'];
export type GuideAppPlatform = (typeof GUIDE_APP_PLATFORMS)[number]['value'];
export type GuideTerminal = (typeof GUIDE_TERMINAL)[number]['value'];
export type GuideAiTool = (typeof GUIDE_AI_TOOLS)[number]['value'];
export type GuideOs = (typeof GUIDE_OS)[number]['value'];
export type GuideAndroidGeminiTool = (typeof GUIDE_ANDROID_GEMINI_TOOL)[number]['value'];

// ── 공지사항 카테고리 ──
export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'promotion', label: '홍보', desc: '프로젝트 홍보 및 소개' },
  { value: 'beta',      label: '베타테스트', desc: '베타 테스터 모집 및 피드백 요청' },
  { value: 'feedback',  label: '의견 수렴', desc: '기능/디자인 등 의견 요청' },
  { value: 'update',    label: '업데이트', desc: '프로젝트 업데이트 공지' },
  { value: 'general',   label: '일반', desc: '기타 일반 공지' },
] as const;

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
