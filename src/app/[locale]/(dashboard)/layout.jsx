import { UserShell } from "@/components/shells";
import { requirePageUser } from "@/server/policies/page-auth";

export default async function DashboardLayout({ children, params }) {
  const { locale } = await params;
  const principal = await requirePageUser(locale);
  return (
    <UserShell
      user={{
        nickname: principal.profile?.nickname ?? null,
        avatarKey: principal.profile?.avatarKey ?? null,
        avatarConfig: principal.profile?.avatarConfig ?? null,
        totalXp: principal.profile?.totalXp ?? 0,
        isAdmin: principal.roles.includes("ADMIN"),
      }}
    >
      {children}
    </UserShell>
  );
}
