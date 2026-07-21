import { createHash, randomBytes } from "node:crypto";

import {
  SESSION_COOKIE_NAME,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_SECONDS,
  getSessionCookieOptions,
} from "@/lib/auth/config";

const BASE64URL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export function createSessionToken() {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function isSessionToken(value) {
  return typeof value === "string" && BASE64URL_TOKEN_PATTERN.test(value);
}

export function digestSessionToken(token, pepper) {
  if (!isSessionToken(token)) {
    throw new TypeError("Invalid session token.");
  }

  if (typeof pepper !== "string" || pepper.length === 0) {
    throw new TypeError("A session pepper is required.");
  }

  return createHash("sha256")
    .update(pepper, "utf8")
    .update("\0")
    .update(token, "utf8")
    .digest("hex");
}

export function getSessionExpiry(now = new Date()) {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1_000);
}

export function getSessionTokenFromRequest(request) {
  const nextCookie = request?.cookies?.get?.(SESSION_COOKIE_NAME);
  const candidate = typeof nextCookie === "string" ? nextCookie : nextCookie?.value;

  if (isSessionToken(candidate)) {
    return candidate;
  }

  const cookieHeader = request?.headers?.get?.("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;

    const value = part.slice(separator + 1).trim();
    return isSessionToken(value) ? value : null;
  }

  return null;
}

export function setSessionCookie(response, token, options) {
  if (!isSessionToken(token)) {
    throw new TypeError("Invalid session token.");
  }

  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(options));
  return response;
}

export function clearSessionCookie(response, options) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(options),
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
