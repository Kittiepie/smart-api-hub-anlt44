import type { Request, Response, NextFunction } from 'express';
import { isValidTable } from '../utils/tableWhitelist';

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
        res.status(404).json({ error: `Resource "${resource}" does not exist` });
        return;
    }

    next();
}