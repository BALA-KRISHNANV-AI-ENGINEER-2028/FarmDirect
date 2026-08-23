/**
 * Thrown from controllers/services to produce a specific HTTP status + message.
 * The central error handler (middleware/errorHandler.ts) knows how to unwrap this;
 * anything else thrown is treated as an unexpected 500.
 */
export class HttpError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = "Bad request", details?: unknown) {
    return new HttpError(400, message, details);
  }
  static unauthorized(message = "Unauthorized") {
    return new HttpError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new HttpError(403, message);
  }
  static notFound(message = "Not found") {
    return new HttpError(404, message);
  }
  static conflict(message = "Conflict", details?: unknown) {
    return new HttpError(409, message, details);
  }
  static unprocessable(message = "Unprocessable entity", details?: unknown) {
    return new HttpError(422, message, details);
  }
  static serviceUnavailable(message = "Service unavailable") {
    return new HttpError(503, message);
  }
}
