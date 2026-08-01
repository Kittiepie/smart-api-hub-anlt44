import type { Request, Response, NextFunction } from 'express';
import { isValidTable } from '../utils/tableWhitelist';
import { AppError } from '../utils/AppError';
import { isSafeTableName } from '../utils/schemaInference';

interface ResourceParams {
    resource: string;
}

export async function validateResource(
    req: Request<ResourceParams>,
    res: Response,
    next: NextFunction
): Promise<void> {
    const { resource } = req.params;

    if (!resource) {
        throw new AppError('Resource name is required', 400);
    }

    const exists = await isValidTable(resource);
    if (exists) {
        next();
        return;
    }

    if (req.method === 'POST') {
        if (!isSafeTableName(resource)) {
            throw new AppError(`"${resource}" is not a valid resource name`, 400);
        }
        next();
        return;
    }

    throw new AppError(`Resource "${resource}" does not exist`, 404);
}