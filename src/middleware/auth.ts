import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function authenticate<P = Record<string, string>>(
    req: Request<P>,
    res: Response,
    next: NextFunction
): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Missing or invalid Authorization header', 401);
    }

    const token = authHeader.slice('Bearer '.length);

    try {
        req.user = verifyToken(token);
        next();
    } catch {
        throw new AppError('Invalid or expired token', 401);
    }
}

export function requireRole(...allowedRoles: string[]) {
    return function roleCheckMiddleware<P = Record<string, string>>(
        req: Request<P>,
        res: Response,
        next: NextFunction
    ): void {
        if (!req.user) {
            throw new AppError('Authentication required', 401);
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new AppError('Insufficient permissions', 403);
        }
        next();
    };
}