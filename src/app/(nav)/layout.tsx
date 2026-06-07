import React from "react";
import { SiteHeader } from "@/components/shared/site-header";
import { MobileNav } from "@/components/shared/page-nav";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader maxWidth="md" showNav />
      <div className="pb-16 sm:pb-0">{children}</div>
      <MobileNav />
    </>
  );
}
