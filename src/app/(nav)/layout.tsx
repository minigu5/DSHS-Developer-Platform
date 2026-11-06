import React from "react";
import { SiteHeader } from "@/components/shared/site-header";
import { MobileNav } from "@/components/shared/page-nav";
import { SiteFooter } from "@/components/home/site-footer";
import { QuickViewHost } from "@/components/projects/quick-view";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader maxWidth="md" showNav />
      <div id="main-content" tabIndex={-1} className="focus:outline-none">
        <QuickViewHost>{children}</QuickViewHost>
      </div>
      <div className="pb-16 sm:pb-0">
        <SiteFooter />
      </div>
      <MobileNav />
    </>
  );
}
