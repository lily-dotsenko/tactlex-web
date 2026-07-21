import { normalizeEmail } from "../src/lib/auth/validation.js";
import { prisma } from "../src/lib/db/prisma.js";

class BootstrapError extends Error {}

async function bootstrapAdmin() {
  const rawEmail = process.env.ADMIN_EMAIL;
  if (!rawEmail) {
    throw new BootstrapError("ADMIN_EMAIL is required for this one-time command.");
  }

  let email;
  try {
    email = normalizeEmail(rawEmail);
  } catch {
    throw new BootstrapError("ADMIN_EMAIL must be a valid email address.");
  }
  return prisma.$transaction(async (transaction) => {
    const [user, role] = await Promise.all([
      transaction.user.findUnique({ where: { email } }),
      transaction.role.findUnique({ where: { code: "ADMIN" } }),
    ]);

    if (!user || user.status !== "ACTIVE") {
      throw new BootstrapError("The target must be an existing active account.");
    }
    if (!role) {
      throw new BootstrapError("The ADMIN role is missing. Run the database seed first.");
    }

    const existing = await transaction.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    if (existing) return { assigned: false };

    await transaction.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        assignedById: null,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorUserId: null,
        action: "ADMIN_BOOTSTRAPPED",
        targetType: "USER_ROLE",
        targetId: user.id,
        metadata: {},
      },
    });

    return { assigned: true };
  });
}

try {
  const result = await bootstrapAdmin();
  console.log(result.assigned ? "Admin role assigned." : "Admin role was already assigned.");
} catch (error) {
  if (error instanceof BootstrapError) {
    console.error("Admin bootstrap failed:", error.message);
  } else {
    console.error("Admin bootstrap failed due to a database error.", {
      name: error?.name ?? "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
    });
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
