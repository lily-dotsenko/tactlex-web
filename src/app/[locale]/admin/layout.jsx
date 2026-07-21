import { AdminShell } from "@/components/shells";
import { requirePageUser } from "@/server/policies/page-auth";

export default async function AdminLayout({ children, params }) {
  const { locale } = await params;
  await requirePageUser(locale, { admin: true });
  return <AdminShell>{children}</AdminShell>;
}
