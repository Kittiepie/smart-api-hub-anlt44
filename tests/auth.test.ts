import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db';
import { uniqueEmail } from './helpers/testUtils';

describe('Auth: POST /auth/register', () => {
    it('registers a new user (happy path)', async () => {
        const email = uniqueEmail('register');
        const res = await request(app)
            .post('/auth/register')
            .send({ email, password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe(email);
        expect(res.body.user.role).toBe('user');
    });

    it('rejects an invalid email format (400)', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'not-an-email', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('rejects a password shorter than 6 characters (400)', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: uniqueEmail('shortpw'), password: '123' });

        expect(res.status).toBe(400);
    });
});

describe('Auth: POST /auth/login', () => {
    it('logs in with correct credentials (happy path)', async () => {
        const email = uniqueEmail('login');
        await request(app).post('/auth/register').send({ email, password: 'password123' });

        const res = await request(app).post('/auth/login').send({ email, password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('rejects a wrong password (401)', async () => {
        const email = uniqueEmail('wrongpw');
        await request(app).post('/auth/register').send({ email, password: 'password123' });

        const res = await request(app).post('/auth/login').send({ email, password: 'wrongpassword' });

        expect(res.status).toBe(401);
    });

    it('rejects a non-existent email (401)', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ email: uniqueEmail('ghost'), password: 'password123' });

        expect(res.status).toBe(401);
    });
});

afterAll(async () => {
    await db.destroy();
});