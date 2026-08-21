import { NextFunction, Request, Response } from 'express';
import { ApiErrors } from '../utils/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (req.session?.user) {
    return next();
  }
  next(ApiErrors.unauthorized());
}
