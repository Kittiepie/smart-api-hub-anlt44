import fs from 'fs';
import path from 'path';
import { db } from './db';
import { clearTableCache } from './utils/tableWhitelist';
import { clearColumnTypeCache } from './utils/columnInfo';

type SchemaFile = Record<string, Record<string, unknown>>;

function loadSchema(): SchemaFile {
    const filePath = path.join(process.cwd(), 'schema.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

function inferColumnType(
    value: unknown,
    context: { table: string; column: string }
): 'string' | 'integer' | 'float' | 'boolean' | 'jsonb' {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    if (typeof value === 'object' && value !== null) return 'jsonb';

    if (value === null) {
        console.warn(
            `"${context.table}.${context.column}" has a null sample value — defaulting to string type. ` +
            `Provide a real sample value (e.g. 0, "", false) in schema.json to control the actual type.`
        );
    }

    return 'string';
}

// serve for relationship
function isForeignKeyColumn(columnName: string): { refTable: string } | null {
    if (!columnName.endsWith('_id')) return null;
    const prefix = columnName.slice(0, -'_id'.length); // 'user_id' -> 'user'
    return { refTable: `${prefix}s` }; // 'user' -> 'users'
}

async function createBaseTables(schema: SchemaFile): Promise<void> {
    for (const [tableName, sampleRow] of Object.entries(schema)) {
        const exists = await db.schema.hasTable(tableName);
        if (exists) {
            console.log(`Table "${tableName}" already exists, skipping.`);
            continue;
        }

        await db.schema.createTable(tableName, (table) => {
            table.increments('id').primary();

            for (const [colName, sampleValue] of Object.entries(sampleRow)) {
                if (isForeignKeyColumn(colName)) continue;

                const type = inferColumnType(sampleValue, { table: tableName, column: colName });
                switch (type) {
                    case 'string':
                        if (colName === 'email') {
                            table.string(colName).unique();
                        } else {
                            table.string(colName);
                        }
                        break;
                    case 'integer': table.integer(colName); break;
                    case 'float': table.float(colName); break;
                    case 'boolean': table.boolean(colName); break;
                    case 'jsonb': table.jsonb(colName); break;
                }
            }

            table.timestamps(true, true);
        });

        console.log(`Created table "${tableName}".`);
    }
}

async function addForeignKeys(schema: SchemaFile): Promise<void> {
    for (const [tableName, sampleRow] of Object.entries(schema)) {
        const exists = await db.schema.hasTable(tableName);
        if (!exists) continue;

        const fkColumns = Object.keys(sampleRow)
            .map((colName) => ({ colName, fk: isForeignKeyColumn(colName) }))
            .filter((entry) => entry.fk !== null);

        for (const { colName, fk } of fkColumns) {
            const hasColumn = await db.schema.hasColumn(tableName, colName);
            if (hasColumn) continue;

            await db.schema.alterTable(tableName, (table) => {
                table
                    .integer(colName)
                    .unsigned()
                    .references('id')
                    .inTable(fk!.refTable)
                    .onDelete('CASCADE');
            });

            console.log(`Added foreign key "${colName}" to "${tableName}".`);
        }
    }
}

// function to snap changes in schema.json (won't apply to foreign key referencing)
async function checkSchemaDrift(schema: SchemaFile): Promise<void> {
    for (const [tableName, sampleRow] of Object.entries(schema)) {
        const exists = await db.schema.hasTable(tableName);
        if (!exists) continue;

        const actualColumns = await db(tableName).columnInfo();
        const actualColumnNames = new Set(Object.keys(actualColumns));

        const expectedNonFkColumns = Object.keys(sampleRow).filter(
            (col) => !isForeignKeyColumn(col)
        );
        const missing = expectedNonFkColumns.filter((col) => !actualColumnNames.has(col));

        if (missing.length > 0) {
            console.warn(
                `schema.json defines new column(s) for "${tableName}" not present in the database: ${missing.join(', ')}.\n` +
                `This won't be applied automatically. Run "docker compose down -v" then "docker compose up --build" to rebuild with the updated schema.`
            );
        }
    }
}

export async function runMigrations(): Promise<void> {
    const schema = loadSchema();
    await createBaseTables(schema);
    await addForeignKeys(schema);
    await checkSchemaDrift(schema);
    clearTableCache();
    clearColumnTypeCache();
    console.log('Migration check complete.');
}

if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Migration failed:', err.message);
            process.exit(1);
        });
}