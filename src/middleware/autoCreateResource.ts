import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { isValidTable, clearTableCache } from '../utils/tableWhitelist';
import { clearColumnTypeCache } from '../utils/columnInfo';
import { inferColumnType, isForeignKeyColumn, isSafeTableName } from '../utils/schemaInference';
import { AppError } from '../utils/AppError';

interface ResourceParams {
    resource: string;
}

export async function autoCreateResource(
    req: Request<ResourceParams>,
    res: Response,
    next: NextFunction
): Promise<void> {
    const { resource } = req.params;

    const exists = await isValidTable(resource);
    if (exists) {
        next(); // normal path — table already there, nothing to do here
        return;
    }

    if (!isSafeTableName(resource)) {
        throw new AppError(
            `"${resource}" is not a valid resource name (lowercase letters, numbers, underscores only)`,
            400
        );
    }

    const body = req.body as Record<string, unknown> | undefined;
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
        throw new AppError(
            `Resource "${resource}" does not exist and cannot be auto-created from an empty body`,
            400
        );
    }

    await db.schema.createTable(resource, (table) => {
        table.increments('id').primary();

        for (const [col, value] of Object.entries(body)) {
            if (isForeignKeyColumn(col)) continue; // added in second pass below

            const type = inferColumnType(value, { table: resource, column: col });
            switch (type) {
                case 'string': table.string(col); break;
                case 'integer': table.integer(col); break;
                case 'float': table.float(col); break;
                case 'boolean': table.boolean(col); break;
                case 'jsonb': table.jsonb(col); break;
            }
        }

        table.timestamps(true, true);
    });

    const fkColumns = Object.keys(body).filter((col) => isForeignKeyColumn(col));

    for (const col of fkColumns) {
        const fk = isForeignKeyColumn(col)!;
        const refExists = await isValidTable(fk.refTable);

        await db.schema.alterTable(resource, (table) => {
            if (refExists) {
                table.integer(col).unsigned().references('id').inTable(fk.refTable).onDelete('CASCADE');
            } else {
                table.integer(col).unsigned();
            }
        });
    }

    clearTableCache();
    clearColumnTypeCache();

    console.log(`Auto-created table "${resource}" from POST body.`);
    next();
}