import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import { validateResource } from '../middleware/validateResource';
import { authenticate, requireRole } from '../middleware/auth';
import { parseFields } from '../utils/parseFields';
import { getColumnTypes, getTextColumns } from '../utils/columnInfo';
import { parsePagination, parseSort, parseFilters, applyFilters } from '../utils/queryHelpers';
import { AppError } from '../utils/AppError';
import { applyEmbed, applyExpand, parseRelationParam } from '../utils/relations';
import { validateResourceBody } from '../middleware/validateResourceBody';
import { autoCreateResource } from '../middleware/autoCreateResource';

interface ResourceParams {
    resource: string;
}

interface ResourceIdParams {
    resource: string;
    id: string;
}

export const resourceRouter = Router();

resourceRouter.use('/:resource', validateResource);

resourceRouter.get('/:resource', async (req: Request<ResourceParams>, res: Response) => {
    const { resource } = req.params;
    const query = req.query as Record<string, unknown>;

    const fields = parseFields(query._fields);
    const { page, limit } = parsePagination(query);
    const sort = parseSort(query);
    const filters = parseFilters(query);
    const searchTerm = typeof query.q === 'string' ? query.q : undefined;
    const expandTargets = parseRelationParam(query._expand);
    const embedTargets = parseRelationParam(query._embed);

    const columnTypes = await getColumnTypes(resource);
    const validColumns = new Set(Object.keys(columnTypes));

    let baseQuery = db(resource);
    baseQuery = applyFilters(baseQuery, filters, validColumns);

    if (searchTerm) {
        const textColumns = await getTextColumns(resource);
        if (textColumns.length > 0) {
            baseQuery = baseQuery.where((builder) => {
                for (const col of textColumns) {
                    builder.orWhere(col, 'ilike', `%${searchTerm}%`);
                }
            });
        }
    }

    const countResult = await baseQuery.clone().count<{ count: string }[]>({ count: '*' });
    const totalCount = Number(countResult[0]?.count ?? 0);

    let dataQuery = baseQuery.clone().select(fields ?? '*');

    if (sort && validColumns.has(sort.column)) {
        dataQuery = dataQuery.orderBy(sort.column, sort.order);
    }

    dataQuery = dataQuery.limit(limit).offset((page - 1) * limit);

    const rows = await dataQuery;

    await applyExpand(rows, resource, expandTargets);
    await applyEmbed(rows, resource, embedTargets);

    res.setHeader('X-Total-Count', totalCount.toString());
    res.json(rows);
});

resourceRouter.get('/:resource/:id', async (req: Request<ResourceIdParams>, res: Response) => {
    const { resource, id } = req.params;
    const fields = parseFields(req.query._fields);
    const query = req.query as Record<string, unknown>;
    const expandTargets = parseRelationParam(query._expand);
    const embedTargets = parseRelationParam(query._embed);

    const row = await db(resource).select(fields ?? '*').where({ id }).first();

    if (!row) {
        throw new AppError(`${resource} with id ${id} not found`, 404);
    }

    const rows = [row];
    await applyExpand(rows, resource, expandTargets);
    await applyEmbed(rows, resource, embedTargets);

    res.json(rows[0]);
});

resourceRouter.post(
    '/:resource',
    authenticate,
    autoCreateResource,
    validateResourceBody('create'),
    async (req: Request<ResourceParams>, res: Response) => {
        const { resource } = req.params;
        const [created] = await db(resource).insert(req.body).returning('*');
        res.status(201).json(created);
    }
);

resourceRouter.put(
    '/:resource/:id',
    authenticate,
    validateResourceBody('replace'),
    async (req: Request<ResourceIdParams>, res: Response) => {
        const { resource, id } = req.params;

        const [updated] = await db(resource)
            .where({ id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');

        if (!updated) {
            throw new AppError(`${resource} with id ${id} not found`, 404);
        }

        res.json(updated);
    }
);

resourceRouter.patch(
    '/:resource/:id',
    authenticate,
    validateResourceBody('update'),
    async (req: Request<ResourceIdParams>, res: Response) => {
        const { resource, id } = req.params;

        const [updated] = await db(resource)
            .where({ id })
            .update({ ...req.body, updated_at: db.fn.now() })
            .returning('*');

        if (!updated) {
            throw new AppError(`${resource} with id ${id} not found`, 404);
        }

        res.json(updated);
    }
);

resourceRouter.delete(
    '/:resource/:id',
    authenticate,
    requireRole('admin'),
    async (req: Request<ResourceIdParams>, res: Response) => {
        const { resource, id } = req.params;
        const deletedCount = await db(resource).where({ id }).del();

        if (deletedCount === 0) {
            throw new AppError(`${resource} with id ${id} not found`, 404);
        }

        res.status(204).send();
    }
);