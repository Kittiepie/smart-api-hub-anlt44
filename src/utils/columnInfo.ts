import { db } from '../db';

// mindset: check real column types at runtime -> cache
const columnTypeCache = new Map<string, Record<string, string>>();

export async function getColumnTypes(tableName: string): Promise<Record<string, string>> {
    const cached = columnTypeCache.get(tableName);
    if (cached) return cached;

    const info = await db(tableName).columnInfo();
    const types: Record<string, string> = {};
    for (const [col, meta] of Object.entries(info)) {
        types[col] = meta.type;
    }

    columnTypeCache.set(tableName, types);
    return types;
}

export async function getTextColumns(tableName: string): Promise<string[]> {
    const types = await getColumnTypes(tableName);
    return Object.entries(types)
        .filter(([, type]) => type === 'character varying' || type === 'text')
        .map(([col]) => col);
}

export function clearColumnTypeCache(): void {
    columnTypeCache.clear();
}