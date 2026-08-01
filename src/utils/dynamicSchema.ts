import { z, type ZodType } from 'zod';
import { getColumnTypes } from './columnInfo';

const NON_EDITABLE_COLUMNS = new Set(['id', 'created_at', 'updated_at']);

function zodTypeForColumn(pgType: string): ZodType {
    switch (pgType) {
        case 'integer':
        case 'bigint':
        case 'smallint':
            return z.number().int();
        case 'real':
        case 'double precision':
        case 'numeric':
            return z.number();
        case 'boolean':
            return z.boolean();
        case 'jsonb':
        case 'json':
            return z.unknown();
        default:
            return z.string();
    }
}

export type ResourceValidationMode = 'create' | 'replace' | 'update';

export async function buildResourceSchema(
    resource: string,
    mode: ResourceValidationMode
): Promise<ZodType> {
    const columnTypes = await getColumnTypes(resource);

    // need to construct an object because zodtype and zodtypeinternal are readonly 
    // not general object construction.
    const shape: Record<string, ZodType> = {};

    for (const [column, pgType] of Object.entries(columnTypes)) {
        if (NON_EDITABLE_COLUMNS.has(column)) continue;
        shape[column] = zodTypeForColumn(pgType).nullable();
    }

    const baseSchema = z.object(shape);

    if (mode === 'update') {
        return baseSchema.partial();
    }

    if (mode === 'create') {
        return baseSchema.partial().refine(
            (data) => Object.keys(data as object).length > 0,
            { message: 'Request body cannot be empty' }
        );
    }

    return baseSchema;
}