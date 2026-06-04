import React from "react";
import { SiteHeader } from "@/components/shared/site-header";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader maxWidth="md" showNav />
      {children}
    </>
  );
}
