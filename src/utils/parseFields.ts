export function parseFields(fieldsParam: unknown): string[] | undefined {
    if (typeof fieldsParam !== 'string' || fieldsParam.trim() === '') {
        return undefined;
    }
    return fieldsParam.split(',').map((f) => f.trim()).filter(Boolean);
}