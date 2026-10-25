import Link from "next/link";

const REPO_URL = "https://github.com/minigu5/DSHS-Developer-Platform";

const COLUMNS = [
  {
    title: "둘러보기",
    links: [
      { href: "/explore", label: "모든 프로젝트" },
      { href: "/tips", label: "개발 팁" },
      { href: "/haejwo", label: "해줘!" },
      { href: "/announcements", label: "공지사항" },
    ],
  },
  {
    title: "만들기",
    links: [
      { href: "/projects/new", label: "내 프로젝트 등록" },
      { href: "/guide", label: "나도 개발해볼래!" },
      { href: "/tips/new", label: "팁 쓰기" },
      { href: "/haejwo/new", label: "해줘! 올리기" },
    ],
  },
  {
    title: "이 사이트",
    links: [
      { href: REPO_URL, label: "GitHub 저장소", external: true },
      { href: `${REPO_URL}/issues`, label: "버그 · 의견 보내기", external: true },
      { href: "/me", label: "마이페이지" },
      { href: "/privacy", label: "개인정보 처리방침" },
    ],
  },
] as const;

/** 홈 푸터 — 소개 한 줄 + 메뉴 3열 + 저작권·로그인 안내. */
export function SiteFooter() {
  const linkClass =
    "hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

  return (
    <footer className="border-t border-zinc-200 px-6 pb-9 pt-10 text-[13px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto grid max-w-5xl gap-7 sm:grid-cols-[1.3fr_2fr]">
        <div>
          <p className="font-heading text-[15px] font-bold text-zinc-900 dark:text-white">DSHS Developer Platform</p>
          <p className="mt-1.5 max-w-[34ch] leading-relaxed break-keep">
            대구과학고 학생들이 만든 프로그램을 모아 두는 곳이에요. 써 보고, 리뷰하고, 내 것도 올려요.
          </p>
        </div>
        <nav aria-label="푸터 메뉴" className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-2.5 text-xs font-semibold text-zinc-900 dark:text-white">{col.title}</h2>
              <ul className="grid gap-[7px]">
                {col.links.map((l) => (
                  <li key={l.href}>
                    {"external" in l && l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className={linkClass}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex flex-col gap-1.5 border-t border-zinc-100 pt-4 text-xs text-zinc-500 sm:col-span-2 sm:flex-row sm:justify-between dark:border-zinc-800/60 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} DSHS Developer Platform</p>
          <p>대구과학고 @ts.hs.kr 계정으로 로그인할 수 있어요.</p>
        </div>
      </div>
    </footer>
  );
}
