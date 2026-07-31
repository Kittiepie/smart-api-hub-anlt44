import express, { type Request, type Response } from 'express';
import { db } from './db';
import { resourceRouter } from './routes/resource';
import { runMigrations } from './migrate';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.json('Hello world!');
});

app.get('/health/db', async (req: Request, res: Response) => {
    const rows = await db.raw('SELECT 1');
    res.json({ db: 'connected', rows: rows.rows });
});

app.use('/auth', authRouter);
app.use(resourceRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// unexpected section
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1); 
});

async function start(): Promise<void> {
    await runMigrations();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});