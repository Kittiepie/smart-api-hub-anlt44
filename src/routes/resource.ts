import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { validateResource } from '../middleware/validateResource';
import { parseFields } from '../utils/parseFields';

interface ResourceParams {
    resource: string;
}

interface ResourceIdParams {
    resource: string;
    id: string;
}

export const resourceRouter = Router();

resourceRouter.use('/:resource', validateResource);

// GET /:resource?_fields=col1,col2
resourceRouter.get('/:resource', async (req: Request<ResourceParams>, res: Response) => {
    const { resource } = req.params;
    const fields = parseFields(req.query._fields);

    const rows = await db(resource).select(fields ?? '*');
    res.json(rows);
});

// GET /:resource/:id
resourceRouter.get('/:resource/:id', async (req: Request<ResourceIdParams>, res: Response) => {
    const { resource, id } = req.params;
    const fields = parseFields(req.query._fields);

    const row = await db(resource).select(fields ?? '*').where({ id }).first();

    if (!row) {
        res.status(404).json({ error: `${resource} with id ${id} not found` });
        return;
    }

    res.json(row);
});

// POST /:resource
resourceRouter.post('/:resource', async (req: Request<ResourceParams>, res: Response) => {
    const { resource } = req.params;

    const [created] = await db(resource).insert(req.body).returning('*');
    res.status(201).json(created);
});

// PUT /:resource/:id — full replace
resourceRouter.put('/:resource/:id', async (req: Request<ResourceIdParams>, res: Response) => {
    const { resource, id } = req.params;

    const [updated] = await db(resource)
        .where({ id })
        .update({ ...req.body, updated_at: db.fn.now() })
        .returning('*');

    if (!updated) {
        res.status(404).json({ error: `${resource} with id ${id} not found` });
        return;
    }

    res.json(updated);
});

// PATCH /:resource/:id — partial update
resourceRouter.patch('/:resource/:id', async (req: Request<ResourceIdParams>, res: Response) => {
    const { resource, id } = req.params;

    const [updated] = await db(resource)
        .where({ id })
        .update({ ...req.body, updated_at: db.fn.now() })
        .returning('*');

    if (!updated) {
        res.status(404).json({ error: `${resource} with id ${id} not found` });
        return;
    }

    res.json(updated);
});

// DELETE /:resource/:id
resourceRouter.delete('/:resource/:id', async (req: Request<ResourceIdParams>, res: Response) => {
    const { resource, id } = req.params;

    const deletedCount = await db(resource).where({ id }).del();

    if (deletedCount === 0) {
        res.status(404).json({ error: `${resource} with id ${id} not found` });
        return;
    }

    res.status(204).send();
});