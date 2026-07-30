import fs from 'fs';
import path from 'path';
import { db } from './db';

type ColumnDef = {
    type: 'string' | 'text' | 'integer' | 'boolean' | 'float' | 'date';
    nullable?: boolean;
    unique?: boolean;
    default?: string | number | boolean;
    references?: string; // ref smt like "users.id"
};

type TableDef = {
    columns: Record<string, ColumnDef>;
};

type SchemaFile = {
    tables: Record<string, TableDef>;
};

function loadSchema(): SchemaFile {
    const filePath = path.join(process.cwd(), 'schema.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

async function createBaseTables(schema: SchemaFile) {
    for (const [tableName, tableDef] of Object.entries(schema.tables)) {
        const exists = await db.schema.hasTable(tableName);
        if (exists) {
            console.log(`Table "${tableName}" already exists, skipping.`);
            continue;
        }

        await db.schema.createTable(tableName, (table) => {
            table.increments('id').primary();

            for (const [colName, colDef] of Object.entries(tableDef.columns)) {
                // Skip FK columns here — added in second pass
                if (colDef.references) continue;

                let column;
                switch (colDef.type) {
                    case 'string':
                        column = table.string(colName);
                        break;
                    case 'text':
                        column = table.text(colName);
                        break;
                    case 'integer':
                        column = table.integer(colName);
                        break;
                    case 'boolean':
                        column = table.boolean(colName);
                        break;
                    case 'float':
                        column = table.float(colName);
                        break;
                    case 'date':
                        column = table.date(colName);
                        break;
                    default:
                        throw new Error(`Unsupported column type: ${colDef.type}`);
                }

                if (colDef.nullable === false) column.notNullable();
                if (colDef.unique) column.unique();
                if (colDef.default !== undefined) column.defaultTo(colDef.default);
            }

            table.timestamps(true, true); // created_at, updated_at
        });

        console.log(`Created table "${tableName}".`);
    }
}

async function addForeignKeys(schema: SchemaFile) {
    for (const [tableName, tableDef] of Object.entries(schema.tables)) {
        const fkColumns = Object.entries(tableDef.columns).filter(
            ([, colDef]) => colDef.references
        );

        if (fkColumns.length === 0) continue;

        await db.schema.alterTable(tableName, (table) => {
            for (const [colName, colDef] of fkColumns) {
                const [refTable, refColumn] = colDef.references!.split('.');
                table
                    .integer(colName)
                    .unsigned()
                    .references(refColumn!)
                    .inTable(refTable!)
                    .onDelete('CASCADE');
            }
        });

        console.log(`Added foreign keys for "${tableName}".`);
    }
}

async function main() {
    const schema = loadSchema();
    await createBaseTables(schema);
    await addForeignKeys(schema);
    console.log('Migration complete.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});