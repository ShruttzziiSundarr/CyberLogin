export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  toJSON() {
    return { error: { code: this.code, message: this.message } };
  }
}

export const ApiErrors = {
  unauthorized: (message = 'Authentication required') => new ApiError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Forbidden') => new ApiError(403, 'FORBIDDEN', message),
  featureDisabled: (message = 'This feature is disabled') => new ApiError(403, 'FEATURE_DISABLED', message),
  notFound: (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message),
  badRequest: (message = 'Bad request') => new ApiError(400, 'BAD_REQUEST', message),
  validation: (message = 'Validation failed') => new ApiError(422, 'VALIDATION_ERROR', message),
  conflict: (message = 'Conflict') => new ApiError(409, 'CONFLICT', message),
  upstream: (message = 'Upstream identity provider error') => new ApiError(502, 'UPSTREAM_ERROR', message),
  internal: (message = 'Internal server error') => new ApiError(500, 'INTERNAL_ERROR', message)
};
