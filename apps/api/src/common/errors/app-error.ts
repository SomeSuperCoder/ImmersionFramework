export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Array<{ field: string; message: string }>,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
