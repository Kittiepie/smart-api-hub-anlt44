import { db } from '../db';

const SYSTEM_TABLES = new Set(['audit_logs']);

let cachedTables: Set<string> | null = null;

export async function getValidTables(): Promise<Set<string>> {
    if (cachedTables) return cachedTables;

    const result = await db('information_schema.tables')
        .select('table_name')
        .where({ table_schema: 'public' });

    cachedTables = new Set(
        result
            .map((row) => row.table_name as string)
            .filter((name) => !SYSTEM_TABLES.has(name))
    );
    return cachedTables;
}

export async function isValidTable(name: string): Promise<boolean> {
    const tables = await getValidTables();
    return tables.has(name);
}

// call this after running migrations, or on server start,
// newly created tables are picked up without waiting for cache expiry.
export function clearTableCache(): void {
    cachedTables = null;
}