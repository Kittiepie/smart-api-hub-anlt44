import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

export const authRouter = Router();

type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;

authRouter.post(
    '/register',
    validateBody(registerSchema),
    async (req: Request<{}, {}, RegisterBody>, res: Response) => {
        const { email, password } = req.body;

        const existing = await db('users').where({ email }).first();
        if (existing) {
            throw new AppError('Email already registered', 409);
        }

        const hashed = await hashPassword(password);

        const [user] = await db('users')
            .insert({ email, password: hashed, role: 'user' })
            .returning(['id', 'email', 'role']);

        const token = signToken({ id: user.id, email: user.email, role: user.role });

        res.status(201).json({ user, token });
    }
);

authRouter.post(
    '/login',
    validateBody(loginSchema),
    async (req: Request<{}, {}, LoginBody>, res: Response) => {
        const { email, password } = req.body;

        const user = await db('users').where({ email }).first();
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        const valid = await comparePassword(password, user.password);
        if (!valid) {
            throw new AppError('Invalid credentials', 401);
        }

        const token = signToken({ id: user.id, email: user.email, role: user.role });

        res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
    }
);