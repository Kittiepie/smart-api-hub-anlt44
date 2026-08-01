import type { Knex } from 'knex';

const RESERVED_PARAMS = new Set(['_page', '_limit', '_sort', '_order', '_fields', 'q', '_expand', '_embed']);
const FILTER_SUFFIXES = ['_gte', '_lte', '_ne', '_like'] as const;
type FilterOperator = (typeof FILTER_SUFFIXES)[number];

interface ParsedFilter {
    column: string;
    operator: FilterOperator;
    value: string;
}

export function parsePagination(query: Record<string, unknown>): { page: number; limit: number } {
    const page = Math.max(1, Number(query._page) || 1);
    const limit = Math.max(1, Number(query._limit) || 10);
    return { page, limit };
}

export function parseSort(query: Record<string, unknown>): { column: string; order: 'asc' | 'desc' } | null {
    if (typeof query._sort !== 'string' || query._sort.trim() === '') return null;
    const order = query._order === 'desc' ? 'desc' : 'asc';
    return { column: query._sort, order };
}

export function parseFilters(query: Record<string, unknown>): ParsedFilter[] {
    const filters: ParsedFilter[] = [];

    for (const [key, rawValue] of Object.entries(query)) {
        if (RESERVED_PARAMS.has(key) || typeof rawValue !== 'string') continue;

        const suffix = FILTER_SUFFIXES.find((s) => key.endsWith(s));
        if (!suffix) continue;

        const column = key.slice(0, -suffix.length);
        filters.push({ column, operator: suffix, value: rawValue });
    }

    return filters;
}

export function applyFilters(
    query: Knex.QueryBuilder,
    filters: ParsedFilter[],
    validColumns: Set<string>
): Knex.QueryBuilder {
    for (const filter of filters) {
        if (!validColumns.has(filter.column)) continue;

        switch (filter.operator) {
            case '_gte':
                query = query.where(filter.column, '>=', filter.value);
                break;
            case '_lte':
                query = query.where(filter.column, '<=', filter.value);
                break;
            case '_ne':
                query = query.where(filter.column, '!=', filter.value);
                break;
            case '_like':
                query = query.where(filter.column, 'ilike', `%${filter.value}%`);
                break;
        }
    }

    return query;
}