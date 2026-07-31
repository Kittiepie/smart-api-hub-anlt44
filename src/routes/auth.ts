import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export const authRouter = Router();

interface RegisterBody {
    email?: string;
    password?: string;
}

authRouter.post('/register', async (req: Request<{}, {}, RegisterBody>, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
        throw new AppError('Email already registered', 409);
    }

    const hashed = await hashPassword(password);

    // not take role from body
    const [user] = await db('users')
        .insert({ email, password: hashed, role: 'user' })
        .returning(['id', 'email', 'role']);

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({ user, token });
});

interface LoginBody {
    email?: string;
    password?: string;
}

authRouter.post('/login', async (req: Request<{}, {}, LoginBody>, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

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
});