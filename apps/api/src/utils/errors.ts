export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERR_UNKNOWN';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string = 'Resource') {
    super(`${entity} not found`, 404, 'ERR_NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'ERR_UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'ERR_FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'ERR_VALIDATION');
    this.details = details;
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'ERR_CONFLICT');
  }
}
