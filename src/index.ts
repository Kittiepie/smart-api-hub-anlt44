import express, { type Request, type Response } from 'express';
import { db } from './db';
import { resourceRouter } from './routes/resource';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.json('Hello, world!');
});

app.get('/health/db', async (req: Request, res: Response) => {
    const rows = await db.raw('SELECT 1');
    res.json({ db: 'connected', rows: rows.rows });
});

app.use(resourceRouter);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});