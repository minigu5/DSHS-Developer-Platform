import { redirect } from "next/navigation";

// 전체 주소 관리는 관리자 대시보드로 옮겼다(2026-11-05)
export default function DomainsAdminPage() {
  redirect("/admin#domains");
}
