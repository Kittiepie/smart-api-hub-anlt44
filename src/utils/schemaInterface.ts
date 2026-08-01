export type InferredType = 'string' | 'integer' | 'float' | 'boolean' | 'jsonb';

export function inferColumnType(value: unknown): InferredType {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'object' && value !== null) return 'jsonb';
    return 'string'; 
}

export function isForeignKeyColumn(columnName: string): { refTable: string } | null {
    if (!columnName.endsWith('_id')) return null;
    const prefix = columnName.slice(0, -'_id'.length);
    return { refTable: `${prefix}s` }; 
}

const IDENTIFIER_REGEX = /^[a-z_][a-z0-9_]*$/;

const RESERVED_NAMES = new Set(['information_schema', 'pg_catalog', 'pg_toast']);

export function isSafeTableName(name: string): boolean {
    if (!IDENTIFIER_REGEX.test(name)) return false;
    if (RESERVED_NAMES.has(name)) return false;
    if (name.startsWith('pg_')) return false;
    return true;
}