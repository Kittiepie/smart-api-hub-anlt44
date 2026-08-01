import express, { type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { db } from './db';
import { resourceRouter } from './routes/resource';
import { authRouter } from './routes/auth';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { openApiSpec } from './openapi';
import { auditLogRouter } from './routes/auditLogs';

export const app = express();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.json('Hello, world!');
});

app.get('/health/db', async (req: Request, res: Response) => {
    const rows = await db.raw('SELECT 1');
    res.json({ db: 'connected', rows: rows.rows });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use('/auth', authRouter);
app.use('/audit-logs', auditLogRouter); // mount order matters: auditLogRouter is mounted before resourceRouter to avoid conflicts with resource names.
app.use(resourceRouter);

app.use(notFoundHandler);
app.use(errorHandler);