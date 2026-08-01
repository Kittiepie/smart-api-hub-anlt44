import { db } from '../db';
import { getColumnTypes } from './columnInfo';
import { isValidTable } from './tableWhitelist';

function pluralize(word: string): string {
    return word.endsWith('s') ? word : `${word}s`;
}

function singularize(word: string): string {
    return word.endsWith('s') ? word.slice(0, -1) : word;
}

export function parseRelationParam(value: unknown): string[] {
    if (typeof value !== 'string' || value.trim() === '') return [];
    return value.split(',').map((v) => v.trim()).filter(Boolean);
}

interface AnyRow {
    [key: string]: unknown;
}

// GET /:resource?_expand=user
export async function applyExpand(
    rows: AnyRow[],
    resource: string,
    expandTargets: string[]
): Promise<void> {
    if (rows.length === 0 || expandTargets.length === 0) return;

    const resourceColumns = await getColumnTypes(resource);

    for (const target of expandTargets) {
        const fkColumn = `${target}_id`;

        if (!(fkColumn in resourceColumns)) continue; 

        const parentTable = pluralize(target);
        if (!(await isValidTable(parentTable))) continue;

        const fkValues = [...new Set(rows.map((r) => r[fkColumn]).filter((v) => v != null))];
        if (fkValues.length === 0) continue;

        // 1 batched query for all rows
        const parentRows = await db(parentTable).whereIn('id', fkValues as (string | number)[]);
        const parentById = new Map(parentRows.map((p) => [String(p.id), p]));

        for (const row of rows) {
            const fkValue = row[fkColumn];
            row[target] = fkValue != null ? (parentById.get(String(fkValue)) ?? null) : null;
        }
    }
}

// GET /:resource?_embed=posts 
export async function applyEmbed(
    rows: AnyRow[],
    resource: string,
    embedTargets: string[]
): Promise<void> {
    if (rows.length === 0 || embedTargets.length === 0) return;

    const fkColumn = `${singularize(resource)}_id`;

    for (const target of embedTargets) {
        if (!(await isValidTable(target))) continue;

        const childColumns = await getColumnTypes(target);
        if (!(fkColumn in childColumns)) continue; 

        const parentIds = [...new Set(rows.map((r) => r.id).filter((v) => v != null))];
        if (parentIds.length === 0) continue;

        // 1 batched query for all rows 
        const childRows = await db(target).whereIn(fkColumn, parentIds as (string | number)[]);

        const childrenByParentId = new Map<string, AnyRow[]>();
        for (const child of childRows) {
            const key = String(child[fkColumn]);
            const list = childrenByParentId.get(key) ?? [];
            list.push(child);
            childrenByParentId.set(key, list);
        }

        for (const row of rows) {
            row[target] = childrenByParentId.get(String(row.id)) ?? [];
        }
    }
}