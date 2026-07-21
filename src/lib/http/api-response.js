import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { DomainError } from "@/server/services/errors";

export function apiData(data, { status = 200, page, headers } = {}) {
  return NextResponse.json(page ? { data, page } : { data }, { status, headers });
}

export function apiError(code, message, { status = 400, fieldErrors, requestId } = {}) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
        ...(requestId ? { requestId } : {}),
      },
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function readJson(request, schema, { maxBytes = 64 * 1024 } = {}) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0];
  if (contentType !== "application/json") {
    throw new DomainError("UNSUPPORTED_MEDIA_TYPE", "Очікується JSON-запит.", 415);
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    throw new DomainError("INVALID_JSON", "Не вдалося прочитати JSON-запит.", 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > maxBytes) {
    throw new DomainError("REQUEST_TOO_LARGE", "Запит перевищує дозволений розмір.", 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new DomainError("INVALID_JSON", "Не вдалося прочитати JSON-запит.", 400);
  }
  return schema.parse(body);
}

export function withApiErrors(handler) {
  return async (...args) => {
    const requestId = crypto.randomUUID();
    try {
      const response = await handler(...args);
      response.headers.set("X-Request-Id", requestId);
      return response;
    } catch (error) {
      if (error instanceof ZodError) {
        return apiError("VALIDATION_ERROR", "Перевірте введені дані.", {
          status: 422,
          requestId,
          fieldErrors: error.flatten().fieldErrors,
        });
      }
      if (error instanceof DomainError) {
        return apiError(error.code, error.message, {
          status: error.status,
          requestId,
          fieldErrors: error.details,
        });
      }

      console.error("Unhandled API error", {
        requestId,
        name: error?.name ?? "Error",
        code: typeof error?.code === "string" ? error.code : undefined,
      });
      return apiError("INTERNAL_ERROR", "Сталася непередбачена помилка.", {
        status: 500,
        requestId,
      });
    }
  };
}
