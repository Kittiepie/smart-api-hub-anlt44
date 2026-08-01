import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/AppError';

export function validateBody(schema: ZodType) {
    return function validateBodyMiddleware<P>(
        req: Request<P>,
        res: Response,
        next: NextFunction
    ): void {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const message = result.error.issues
                .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
                .join('; ');
            throw new AppError(message, 400);
        }

        req.body = result.data;
        next();
    };
}