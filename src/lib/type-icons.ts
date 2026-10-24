import {
  Apple,
  BookOpen,
  Bot,
  Code2,
  FileText,
  Film,
  Gamepad2,
  Globe,
  Laptop,
  Monitor,
  MoreHorizontal,
  Package,
  Puzzle,
  Server,
  Smartphone,
  Sparkles,
  Terminal,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** 프로그램 종류(`PROJECT_TYPES.value`) → 아이콘. 탐색 필터·해줘 카드·등록 폼·위저드가 공유한다. */
export const TYPE_ICONS: Record<string, LucideIcon> = {
  website: Globe,
  app: Smartphone,
  extension: Puzzle,
  cli: Terminal,
  library: Package,
};

/** 지원 플랫폼(`PLATFORMS.value`) → 아이콘 */
export const PLATFORM_ICONS: Record<string, LucideIcon> = {
  web: Globe,
  ios: Apple,
  android: Bot,
  windows: Monitor,
  macos: Laptop,
  linux: Server,
};

/** 카테고리(`FEATURES.value`) → 아이콘 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  document: FileText,
  ai: Sparkles,
  study: BookOpen,
  utility: Wrench,
  game: Gamepad2,
  social: Users,
  media: Film,
  productivity: Zap,
  "dev-tool": Code2,
  other: MoreHorizontal,
};
