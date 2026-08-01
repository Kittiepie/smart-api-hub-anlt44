import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

interface PgError {
    code: string;
    message: string;
}

function isPgError(err: unknown): err is PgError {
    return typeof err === 'object' && err !== null && 'code' in err;
}

function mapPgError(err: PgError): { status: number; message: string } {
    switch (err.code) {
        case '23505': // unique_violation
            return { status: 409, message: 'Duplicate value violates a unique constraint' };
        case '23503': // foreign_key_violation
            return { status: 400, message: 'Referenced record does not exist' };
        case '23502': // not_null_violation
            return { status: 400, message: 'Missing required field' };
        case '22P02': // invalid_text_representation
            return { status: 400, message: 'Invalid input value' };
        default:
            return { status: 500, message: 'Database error' };
    }
}

// Must have exactly 4 params — this is how Express identifies error-handling middleware
export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    console.error('Error handling request:', err);

    if (err instanceof AppError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

    if (isPgError(err)) {
        const { status, message } = mapPgError(err);
        res.status(status).json({ error: message });
        return;
    }

    res.status(500).json({ error: 'Internal server error' });
}