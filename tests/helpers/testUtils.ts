import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db';

export function uniqueEmail(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`;
}

export async function registerUser(email: string, password = 'password123') {
    const res = await request(app).post('/auth/register').send({ email, password });
    return res.body as { user: { id: number; email: string; role: string }; token: string };
}

export async function promoteToAdmin(userId: number): Promise<void> {
    await db('users').where({ id: userId }).update({ role: 'admin' });
}