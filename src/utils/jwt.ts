import jwt from 'jsonwebtoken';
import { env } from '../env';

export interface JwtPayload {
    id: number;
    email: string;
    role: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}