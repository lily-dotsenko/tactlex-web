import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  ["profile.read_self", "Читати власний профіль", "Read own profile"],
  ["profile.update_self", "Оновлювати власний профіль", "Update own profile"],
  ["learning.read", "Читати навчальний контент", "Read learning content"],
  ["learning.submit", "Надсилати навчальні відповіді", "Submit learning answers"],
  ["reports.create", "Повідомляти про помилки", "Report content issues"],
  ["leaderboards.read", "Читати рейтинг", "Read leaderboards"],
  ["users.read", "Переглядати користувачів", "Read users"],
  ["users.update", "Керувати станом користувачів", "Update user status"],
  ["roles.assign", "Призначати дозволені ролі", "Assign allowed roles"],
  ["categories.manage", "Керувати категоріями", "Manage categories"],
  ["terms.manage", "Редагувати чернетки термінів", "Manage draft terms"],
  ["terms.review", "Перевіряти терміни", "Review terms"],
  ["terms.publish", "Публікувати терміни", "Publish terms"],
  ["lessons.manage", "Керувати уроками", "Manage lessons"],
  ["achievements.manage", "Керувати досягненнями", "Manage achievements"],
  ["reports.manage", "Опрацьовувати повідомлення", "Resolve reports"],
  ["audit.read", "Читати журнал аудиту", "Read audit log"],
  ["audio.manage", "Керувати людським аудіо", "Manage human audio"],
  ["imports.create", "Імпортувати чернетки", "Import drafts"],
].map(([code, nameUk, nameEn]) => ({
  code,
  nameUk,
  nameEn,
  descriptionUk: nameUk,
  descriptionEn: nameEn,
}));

const userPermissionCodes = permissions.slice(0, 6).map(({ code }) => code);
const adminPermissionCodes = permissions.map(({ code }) => code);

const categories = [
  {
    slug: "basic-military-english",
    nameUk: "Базова військова англійська",
    nameEn: "Basic military English",
    descriptionUk:
      "Тематичні уроки від A1 до B2: щоденна комунікація, час, підрозділи, техніка, спорядження та точна термінологія.",
    descriptionEn:
      "A1 to B2 thematic lessons covering daily communication, time, units, vehicles, equipment and precise terminology.",
    targetTermCount: 100,
    displayOrder: 1,
  },
  {
    slug: "general-tactical-english",
    nameUk: "Загальна тактична англійська",
    nameEn: "General tactical English",
    descriptionUk: "Базові команди, позначення та взаємодія в публічному навчальному контексті.",
    descriptionEn: "Core commands, labels and interaction in a public training context.",
    targetTermCount: 60,
    displayOrder: 2,
  },
  {
    slug: "tactical-medicine",
    nameUk: "Тактична медицина / TCCC",
    nameEn: "Tactical medicine / TCCC",
    descriptionUk:
      "Мовна термінологія з відкритих перевірених джерел; не замінює сертифіковане навчання.",
    descriptionEn:
      "Language terminology from verified public sources; not a substitute for certified training.",
    targetTermCount: 50,
    displayOrder: 3,
  },
  {
    slug: "drones-uas",
    nameUk: "Дрони та UAS",
    nameEn: "Drones and UAS",
    descriptionUk: "Загальнодоступна англійська термінологія без оперативних інструкцій.",
    descriptionEn: "Public English terminology without operational instructions.",
    targetTermCount: 50,
    displayOrder: 4,
  },
  {
    slug: "sniper-terminology",
    nameUk: "Снайперська термінологія",
    nameEn: "Sniper terminology",
    descriptionUk: "Мовний словник із відкритих джерел без інструкцій із застосування зброї.",
    descriptionEn: "A public-source language glossary without weapon-employment instruction.",
    targetTermCount: 40,
    displayOrder: 5,
  },
];

const achievementDefinitions = [
  {
    code: "first-lesson",
    nameUk: "Перший вихід",
    nameEn: "First sortie",
    descriptionUk: "Завершити перший урок.",
    descriptionEn: "Complete your first lesson.",
    iconKey: "route",
    rewardXp: 25,
    displayOrder: 1,
    rule: { metric: "LESSONS_COMPLETED", threshold: 1 },
  },
  {
    code: "ten-correct-streak",
    nameUk: "Точна серія",
    nameEn: "Accurate streak",
    descriptionUk: "Дати 10 правильних відповідей поспіль.",
    descriptionEn: "Give 10 correct answers in a row.",
    iconKey: "target",
    rewardXp: 25,
    displayOrder: 2,
    rule: { metric: "CONSECUTIVE_CORRECT", threshold: 10, window: "CURRENT_STREAK" },
  },
  {
    code: "perfect-lesson",
    nameUk: "Чистий прохід",
    nameEn: "Clean run",
    descriptionUk: "Завершити урок без помилок.",
    descriptionEn: "Complete a lesson without mistakes.",
    iconKey: "shield-check",
    rewardXp: 30,
    displayOrder: 3,
    rule: { metric: "PERFECT_LESSONS", threshold: 1, window: "SINGLE_SESSION" },
  },
  {
    code: "twenty-category-terms",
    nameUk: "Опорний словник",
    nameEn: "Core vocabulary",
    descriptionUk: "Опрацювати 20 термінів однієї категорії.",
    descriptionEn: "Master 20 terms in one category.",
    iconKey: "book-open",
    rewardXp: 40,
    displayOrder: 4,
    rule: { metric: "MASTERED_TERMS_IN_CATEGORY", threshold: 20 },
  },
  {
    code: "hundred-terms",
    nameUk: "Сотня термінів",
    nameEn: "One hundred terms",
    descriptionUk: "Опрацювати 100 перевірених термінів.",
    descriptionEn: "Master 100 reviewed terms.",
    iconKey: "layers",
    rewardXp: 100,
    displayOrder: 5,
    rule: { metric: "MASTERED_TERMS", threshold: 100 },
  },
  {
    code: "all-two-hundred",
    nameUk: "Повний комплект",
    nameEn: "Full set",
    descriptionUk: "Опрацювати всі 200 термінів стартової програми.",
    descriptionEn: "Master all 200 terms in the initial curriculum.",
    iconKey: "award",
    rewardXp: 200,
    displayOrder: 6,
    rule: { metric: "MASTERED_TERMS", threshold: 200 },
  },
  {
    code: "streak-seven",
    nameUk: "Тиждень у ритмі",
    nameEn: "Seven-day rhythm",
    descriptionUk: "Виконувати денну ціль 7 днів поспіль.",
    descriptionEn: "Meet the daily goal for 7 consecutive days.",
    iconKey: "flame",
    rewardXp: 50,
    displayOrder: 7,
    rule: { metric: "CURRENT_STREAK", threshold: 7, window: "CURRENT_STREAK" },
  },
  {
    code: "streak-thirty",
    nameUk: "Тридцять днів",
    nameEn: "Thirty days",
    descriptionUk: "Виконувати денну ціль 30 днів поспіль.",
    descriptionEn: "Meet the daily goal for 30 consecutive days.",
    iconKey: "calendar-check",
    rewardXp: 150,
    displayOrder: 8,
    rule: { metric: "CURRENT_STREAK", threshold: 30, window: "CURRENT_STREAK" },
  },
  {
    code: "corrected-twenty-five",
    nameUk: "Робота над помилками",
    nameEn: "Lessons learned",
    descriptionUk: "Правильно повторити 25 раніше помилкових слів.",
    descriptionEn: "Correctly review 25 previously missed terms.",
    iconKey: "refresh-cw",
    rewardXp: 75,
    displayOrder: 9,
    rule: { metric: "PREVIOUSLY_MISSED_CORRECT", threshold: 25 },
  },
];

function currentIsoWeek(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86_400_000 + 1) / 7);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - 3);
  monday.setUTCHours(0, 0, 0, 0);
  const nextMonday = new Date(monday.getTime() + 7 * 86_400_000);
  return {
    slug: `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`,
    startsAt: monday,
    endsAt: nextMonday,
  };
}

async function seed() {
  await prisma.$transaction(async (db) => {
    for (const permission of permissions) {
      await db.permission.upsert({
        where: { code: permission.code },
        update: permission,
        create: permission,
      });
    }

    const userRole = await db.role.upsert({
      where: { code: "USER" },
      update: { nameUk: "Користувач", nameEn: "User", isSystem: true },
      create: {
        code: "USER",
        nameUk: "Користувач",
        nameEn: "User",
        isSystem: true,
      },
    });
    const adminRole = await db.role.upsert({
      where: { code: "ADMIN" },
      update: { nameUk: "Адміністратор", nameEn: "Administrator", isSystem: true },
      create: {
        code: "ADMIN",
        nameUk: "Адміністратор",
        nameEn: "Administrator",
        isSystem: true,
      },
    });
    const allPermissions = await db.permission.findMany({ select: { id: true, code: true } });
    const permissionByCode = new Map(
      allPermissions.map((permission) => [permission.code, permission]),
    );
    await db.rolePermission.createMany({
      data: [
        ...userPermissionCodes.map((code) => ({
          roleId: userRole.id,
          permissionId: permissionByCode.get(code).id,
        })),
        ...adminPermissionCodes.map((code) => ({
          roleId: adminRole.id,
          permissionId: permissionByCode.get(code).id,
        })),
      ],
      skipDuplicates: true,
    });

    for (const category of categories) {
      await db.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
    }

    for (const definition of achievementDefinitions) {
      const { rule, ...achievement } = definition;
      const saved = await db.achievement.upsert({
        where: { code: achievement.code },
        update: achievement,
        create: achievement,
      });
      await db.achievementRule.deleteMany({ where: { achievementId: saved.id } });
      await db.achievementRule.create({ data: { achievementId: saved.id, ...rule } });
    }

    await db.leaderboardPeriod.upsert({
      where: { slug: "all-time" },
      update: { type: "ALL_TIME", startsAt: null, endsAt: null },
      create: { slug: "all-time", type: "ALL_TIME" },
    });
    const week = currentIsoWeek();
    await db.leaderboardPeriod.upsert({
      where: { slug: week.slug },
      update: { type: "WEEKLY", startsAt: week.startsAt, endsAt: week.endsAt },
      create: { ...week, type: "WEEKLY" },
    });
  });
}

try {
  await seed();
  console.log("TactLex structural seed completed.");
} finally {
  await prisma.$disconnect();
}
