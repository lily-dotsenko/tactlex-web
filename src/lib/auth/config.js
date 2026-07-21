export const SESSION_COOKIE_NAME = "tactlex_session";
export const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
export const SESSION_IDLE_TTL_SECONDS = 60 * 60 * 24 * 7;

export function getSessionCookieOptions({ secure = process.env.NODE_ENV === "production" } = {}) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function getSessionPepper(environment = process.env) {
  const pepper = environment.SESSION_PEPPER?.trim();

  if (pepper) {
    if (
      environment.NODE_ENV === "production" &&
      pepper === "replace-with-a-random-production-secret"
    ) {
      throw new Error("SESSION_PEPPER must be replaced before production starts.");
    }

    if (environment.NODE_ENV === "production" && Buffer.byteLength(pepper, "utf8") < 32) {
      throw new Error("SESSION_PEPPER must contain at least 32 bytes in production.");
    }

    return pepper;
  }

  if (environment.NODE_ENV === "production") {
    throw new Error("SESSION_PEPPER is required in production.");
  }

  return "tactlex-development-session-pepper";
}
