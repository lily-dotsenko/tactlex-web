export class DomainError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function notFound(message = "Ресурс не знайдено.") {
  return new DomainError("NOT_FOUND", message, 404);
}

export function forbidden(message = "Недостатньо прав для цієї дії.") {
  return new DomainError("FORBIDDEN", message, 403);
}

export function conflict(code, message) {
  return new DomainError(code, message, 409);
}
