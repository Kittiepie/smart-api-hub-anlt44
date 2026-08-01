import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const auditLogRouter = Router();

auditLogRouter.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
    const rows = await db('audit_logs').orderBy('timestamp', 'desc').limit(100);
    res.json(rows);
});