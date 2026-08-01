import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { buildResourceSchema, type ResourceValidationMode } from '../utils/dynamicSchema';

export function validateResourceBody(mode: ResourceValidationMode) {
    return async function validateResourceBodyMiddleware(
        req: Request<{ resource: string }>,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        const { resource } = req.params;
        const schema = await buildResourceSchema(resource, mode);
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