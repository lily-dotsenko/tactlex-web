import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { createAuthService } from "@/server/services/auth-service";

export async function requirePageUser(locale, { admin = false } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const principal = token ? await createAuthService({ db: prisma }).authenticateToken(token) : null;

  if (!principal || principal.status !== "ACTIVE") {
    redirect(`/${locale}/login`);
  }
  if (admin && !principal.roles.includes("ADMIN")) {
    redirect(`/${locale}/dashboard`);
  }

  return principal;
}
