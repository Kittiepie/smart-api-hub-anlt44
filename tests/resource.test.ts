import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db';
import { uniqueEmail, registerUser, promoteToAdmin } from './helpers/testUtils';

let userToken: string;
let userId: number;
let adminToken: string;
let createdPostId: number;

beforeAll(async () => {
    const user = await registerUser(uniqueEmail('resuser'));
    userToken = user.token;
    userId = user.user.id;

    const adminAccount = await registerUser(uniqueEmail('resadmin'));
    await promoteToAdmin(adminAccount.user.id);

    const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: adminAccount.user.email, password: 'password123' });
    adminToken = loginRes.body.token;
});

describe('GET /:resource', () => {
    it('returns a list with X-Total-Count header (happy path)', async () => {
        const res = await request(app).get('/posts');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.headers['x-total-count']).toBeDefined();
    });

    it('returns 404 for an unknown resource', async () => {
        const res = await request(app).get('/not_a_real_table');

        expect(res.status).toBe(404);
    });
});

describe('GET /:resource/:id', () => {
    it('returns 404 for a non-existent id', async () => {
        const res = await request(app).get('/posts/9999999');

        expect(res.status).toBe(404);
    });
});

describe('POST /:resource', () => {
    it('rejects a request with no auth token (401)', async () => {
        const res = await request(app)
            .post('/posts')
            .send({ title: 'No auth', content: 'test', user_id: userId });

        expect(res.status).toBe(401);
    });

    it('rejects a body with the wrong field type (400)', async () => {
        const res = await request(app)
            .post('/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 12345, content: 'test', user_id: userId }); // title should be a string

        expect(res.status).toBe(400);
    });

    it('creates a resource with a valid token and body (happy path)', async () => {
        const res = await request(app)
            .post('/posts')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Test post', content: 'Some content', user_id: userId });

        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        createdPostId = res.body.id;
    });
});

describe('PUT /:resource/:id', () => {
    it('rejects a PUT with missing fields — full replace requires all fields (400)', async () => {
        const res = await request(app)
            .put(`/posts/${createdPostId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Only title provided' }); // missing content, user_id

        expect(res.status).toBe(400);
    });

    it('accepts a PUT with every field present (happy path)', async () => {
        const res = await request(app)
            .put(`/posts/${createdPostId}`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ title: 'Replaced title', content: 'Replaced content', user_id: userId });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Replaced title');
    });
});

describe('DELETE /:resource/:id', () => {
    it('rejects deletion from a non-admin user (403)', async () => {
        const res = await request(app)
            .delete(`/posts/${createdPostId}`)
            .set('Authorization', `Bearer ${userToken}`);

        expect(res.status).toBe(403);
    });

    it('allows deletion from an admin user (happy path)', async () => {
        const res = await request(app)
            .delete(`/posts/${createdPostId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(204);
    });
});

afterAll(async () => {
    await db.destroy();
});