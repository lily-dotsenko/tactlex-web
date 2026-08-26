const NEON_DATABASE_URL_KEYS = [
  "NEON_POSTGRES_PRISMA_URL",
  "NEON_POSTGRES_URL",
  "NEON_DATABASE_URL",
];

export function isPostgresUrl(value) {
  return /^postgres(?:ql)?:\/\//i.test(value?.trim() ?? "");
}

export function configureDatabaseUrl(env = process.env) {
  if (isPostgresUrl(env.DATABASE_URL)) {
    env.DATABASE_URL = env.DATABASE_URL.trim();
    return env.DATABASE_URL;
  }

  const neonUrl = NEON_DATABASE_URL_KEYS.map((key) => env[key]).find(isPostgresUrl);

  if (neonUrl) {
    env.DATABASE_URL = neonUrl.trim();
  }

  return env.DATABASE_URL;
}
