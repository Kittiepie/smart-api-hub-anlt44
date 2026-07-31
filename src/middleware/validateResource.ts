import type { Request, Response, NextFunction } from 'express';
import { isValidTable } from '../utils/tableWhitelist';
import { AppError } from '../utils/AppError';

interface ResourceParams {
    resource: string;
}

export async function validateResource(
    req: Request<ResourceParams>,
    res: Response,
    next: NextFunction
): Promise<void> {
    const { resource } = req.params;

    if (!resource || !(await isValidTable(resource))) {
        next(new AppError(`Resource "${resource}" does not exist`, 404));
        return;
    }

    next();
}