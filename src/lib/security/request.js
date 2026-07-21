import { DomainError } from "@/server/services/errors";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function parseOrigin(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function getOrigin(value) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getAllowedOrigins(environment = process.env) {
  const configured = (environment.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => parseOrigin(value.trim()))
    .filter(Boolean);

  return new Set(configured);
}

export function assertSameOrigin(request, { environment = process.env } = {}) {
  const method = request.method?.toUpperCase();
  if (!MUTATION_METHODS.has(method)) return;

  const allowed = getAllowedOrigins(environment);
  const requestOrigin = parseOrigin(new URL(request.url).origin);

  if (environment.NODE_ENV !== "production" && requestOrigin) {
    allowed.add(requestOrigin);
  }

  if (allowed.size === 0) {
    throw new DomainError("ORIGIN_NOT_ALLOWED", "Джерело запиту не дозволено.", 403);
  }

  if (!requestOrigin || !allowed.has(requestOrigin)) {
    throw new DomainError("HOST_NOT_ALLOWED", "Адреса призначення запиту не дозволена.", 403);
  }

  const suppliedOrigin = parseOrigin(request.headers.get("origin"));
  if (suppliedOrigin) {
    if (allowed.has(suppliedOrigin)) return;
    throw new DomainError("ORIGIN_NOT_ALLOWED", "Джерело запиту не дозволено.", 403);
  }

  if (environment.NODE_ENV !== "production") {
    const refererOrigin = getOrigin(request.headers.get("referer"));
    if (refererOrigin && allowed.has(refererOrigin)) return;
  }

  throw new DomainError("ORIGIN_REQUIRED", "Потрібне коректне джерело запиту.", 403);
}

export function assertBodySize(request, { maxBytes = 32_768 } = {}) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new DomainError("REQUEST_TOO_LARGE", "Тіло запиту завелике.", 413);
  }
}
