import { createHash } from "node:crypto";

function normalizeIp(value) {
  return value?.split(",", 1)[0]?.trim().slice(0, 128) || "unknown";
}

export function digestPrivateValue(value, pepper, purpose) {
  if (!pepper) throw new TypeError("A pepper is required.");
  if (!purpose) throw new TypeError("A digest purpose is required.");

  return createHash("sha256")
    .update(purpose, "utf8")
    .update("\0")
    .update(pepper, "utf8")
    .update("\0")
    .update(String(value), "utf8")
    .digest("hex");
}

export function getRequestClientMetadata(request, pepper) {
  const ip = normalizeIp(
    request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip"),
  );
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) || null;

  return {
    ipDigest: digestPrivateValue(ip, pepper, "client-ip"),
    rateLimitIdentity: ip,
    userAgent,
  };
}
