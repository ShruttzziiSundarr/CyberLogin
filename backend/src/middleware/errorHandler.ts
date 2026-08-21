import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/errors';
import { PingFederateApiError } from '../pingfederate/errors';
import { logger } from '../utils/logger';

/** Normalizes every thrown error into the { error: { code, message } } envelope; never leaks raw upstream payloads. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error({ err, path: req.path }, 'Request failed');
    return res.status(err.status).json(err.toJSON());
  }

  if (err instanceof PingFederateApiError) {
    logger.warn({ status: err.status, code: err.code, path: req.path }, 'Upstream identity provider error');
    const status = err.status >= 400 && err.status < 500 ? 502 : err.status;
    return res.status(status).json({ error: { code: err.code, message: err.message } });
  }

  // Duck-type http-errors style errors (e.g. thrown by csrf-csrf on an invalid/missing CSRF token).
  const httpErr = err as { status?: number; statusCode?: number; code?: string; message?: string };
  const status = httpErr?.status ?? httpErr?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    logger.warn({ status, code: httpErr.code, path: req.path }, 'Request rejected');
    return res.status(status).json({ error: { code: httpErr.code ?? 'REQUEST_ERROR', message: httpErr.message ?? 'Request error' } });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}
