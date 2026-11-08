import {
  Apple,
  BadgeDollarSign,
  BookOpen,
  Bot,
  Code2,
  FileText,
  Film,
  Gamepad2,
  Globe,
  Laptop,
  Lock,
  LockOpen,
  Monitor,
  MoreHorizontal,
  Package,
  Pencil,
  Puzzle,
  Scale,
  Server,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  User,
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

/** 소스코드(`SOURCE_TYPES.value`) → 아이콘 */
export const SOURCE_ICONS: Record<string, LucideIcon> = {
  open: LockOpen,
  closed: Lock,
};

/** 라이선스 권한(`LICENSE_FEATURES.value`) → 아이콘 */
export const LICENSE_ICONS: Record<string, LucideIcon> = {
  commercial: BadgeDollarSign,
  modify: Pencil,
  distribute: Share2,
  private: User,
  liability: Scale,
  warranty: ShieldCheck,
};
