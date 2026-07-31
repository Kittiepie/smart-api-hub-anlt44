import { db } from '../db';

// for lazy people come here ^^
async function seed(): Promise<void> {
    const existingUsers = await db('users').count<{ count: string }[]>({ count: '*' });
    if (Number(existingUsers[0]?.count ?? 0) > 0) {
        console.log('Users already seeded, skipping.');
        process.exit(0);
    }

    const users = await db('users')
        .insert([
            { email: 'alice@example.com', password: 'hashed_pw_1', role: 'admin' },
            { email: 'bob@example.com', password: 'hashed_pw_2', role: 'user' },
            { email: 'carol@example.com', password: 'hashed_pw_3', role: 'user' },
        ])
        .returning('id');

    const userIds = users.map((u) => u.id);

    const posts = await db('posts')
        .insert([
            { title: 'Getting started with Docker', content: 'Docker makes deployment easy...', user_id: userIds[0] },
            { title: 'Understanding PostgreSQL', content: 'Postgres is a powerful relational database...', user_id: userIds[0] },
            { title: 'Why TypeScript matters', content: 'Type safety catches bugs early...', user_id: userIds[1] },
            { title: 'REST API best practices', content: 'Consistent endpoints make APIs easier to use...', user_id: userIds[1] },
            { title: 'Intro to Knex.js', content: 'A SQL query builder for Node.js...', user_id: userIds[2] },
        ])
        .returning('id');

    const postIds = posts.map((p) => p.id);

    await db('comments').insert([
        { content: 'Great explanation, thanks!', post_id: postIds[0], user_id: userIds[1] },
        { content: 'This helped me a lot.', post_id: postIds[0], user_id: userIds[2] },
        { content: 'Could you cover volumes too?', post_id: postIds[1], user_id: userIds[1] },
        { content: 'Looking forward to more posts.', post_id: postIds[2], user_id: userIds[0] },
    ]);

    console.log('Seed data inserted.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exit(1);
});