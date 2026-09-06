#!/usr/bin/env node
/**
 * Check `types/database.ts` against the actual database.
 *
 * `supabase gen types typescript` needs Docker, which is not always available,
 * so the types in this repository are maintained by hand. This script closes
 * that gap: it introspects a live database and fails if any table, column,
 * nullability or "has a default" flag has drifted from the checked-in types.
 *
 * Usage:
 *   node scripts/verify-database-types.mjs [DATABASE_URL]
 *
 * Falls back to $SUPABASE_DB_URL and then to a local `spending_tracker`
 * database. Requires `psql` on PATH.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl =
  process.argv[2] ?? process.env.SUPABASE_DB_URL ?? "postgresql:///spending_tracker";

/** Postgres type -> the TypeScript type Supabase's generator emits for it. */
const TYPE_MAP = {
  uuid: "string",
  text: "string",
  date: "string",
  "timestamp with time zone": "string",
  numeric: "number",
  integer: "number",
  boolean: "boolean",
};

function query(sql) {
  const output = execFileSync("psql", [databaseUrl, "--no-psqlrc", "-At", "-F", "\u0001", "-c", sql], {
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\u0001"));
}

function readDatabaseSchema() {
  const rows = query(`
    select c.table_name, c.column_name, c.data_type, c.is_nullable,
           case when c.column_default is null then 'no' else 'yes' end as has_default,
           t.table_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
    order by c.table_name, c.ordinal_position
  `);

  const schema = new Map();
  for (const [table, column, dataType, isNullable, hasDefault, tableType] of rows) {
    if (!schema.has(table)) schema.set(table, { isView: tableType === "VIEW", columns: new Map() });
    schema.get(table).columns.set(column, {
      dataType,
      nullable: isNullable === "YES",
      hasDefault: hasDefault === "yes",
    });
  }
  return schema;
}

/**
 * Pull the Row/Insert blocks out of types/database.ts.
 *
 * A brace-depth scan is used rather than a regex because the file nests
 * `Relationships` arrays inside each table entry.
 */
function readCheckedInTypes() {
  const source = readFileSync(path.join(root, "types", "database.ts"), "utf8");
  const tables = new Map();

  const entryPattern = /^ {6}(\w+): \{$/gm;
  let match;
  while ((match = entryPattern.exec(source)) !== null) {
    const tableName = match[1];
    const body = extractBlock(source, entryPattern.lastIndex);
    const row = parseFields(extractNamedBlock(body, "Row"));
    const insert = parseFields(extractNamedBlock(body, "Insert"));

    // Entries under `Functions` sit at the same indentation as tables but
    // describe Args/Returns rather than columns.
    if (row.size === 0 && insert.size === 0) continue;

    tables.set(tableName, { row, insert });
  }

  return tables;
}

function extractBlock(source, startIndex) {
  let depth = 1;
  let index = startIndex;
  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
    index += 1;
  }
  return source.slice(startIndex, index - 1);
}

function extractNamedBlock(body, name) {
  const marker = new RegExp(`^\\s*${name}: \\{$`, "m");
  const found = marker.exec(body);
  if (!found) return "";
  return extractBlock(body, found.index + found[0].length);
}

function parseFields(block) {
  const fields = new Map();
  const pattern = /^\s*(\w+)(\?)?: ([^;]+);$/gm;
  let match;
  while ((match = pattern.exec(block)) !== null) {
    const [, name, optional, rawType] = match;
    const type = rawType.trim();
    fields.set(name, {
      optional: optional === "?",
      nullable: type.includes("| null"),
      base: type.replace("| null", "").trim(),
    });
  }
  return fields;
}

const problems = [];
const checked = { tables: 0, columns: 0 };

const database = readDatabaseSchema();
const declared = readCheckedInTypes();

for (const [tableName, { isView, columns }] of database) {
  const declaredTable = declared.get(tableName);
  if (!declaredTable) {
    problems.push(`${tableName}: present in the database but missing from types/database.ts`);
    continue;
  }
  checked.tables += 1;

  for (const [columnName, column] of columns) {
    checked.columns += 1;
    const rowField = declaredTable.row.get(columnName);
    if (!rowField) {
      problems.push(`${tableName}.${columnName}: missing from the Row type`);
      continue;
    }

    const expectedBase = TYPE_MAP[column.dataType];
    if (!expectedBase) {
      problems.push(`${tableName}.${columnName}: unmapped Postgres type "${column.dataType}"`);
    } else if (rowField.base !== expectedBase) {
      problems.push(
        `${tableName}.${columnName}: Row declares ${rowField.base}, database has ${column.dataType} (expected ${expectedBase})`,
      );
    }

    // Views report every column as nullable, which is what the generator emits.
    const expectedNullable = isView ? true : column.nullable;
    if (rowField.nullable !== expectedNullable) {
      problems.push(
        `${tableName}.${columnName}: Row nullability is ${rowField.nullable}, database says ${expectedNullable}`,
      );
    }

    if (isView) continue;

    const insertField = declaredTable.insert.get(columnName);
    if (!insertField) {
      problems.push(`${tableName}.${columnName}: missing from the Insert type`);
      continue;
    }

    // A column is optional on insert exactly when it is nullable or defaulted.
    const expectedOptional = column.nullable || column.hasDefault;
    if (insertField.optional !== expectedOptional) {
      problems.push(
        `${tableName}.${columnName}: Insert marks it ${
          insertField.optional ? "optional" : "required"
        }, but the column is ${expectedOptional ? "nullable or defaulted" : "required"}`,
      );
    }
  }

  for (const columnName of declaredTable.row.keys()) {
    if (!columns.has(columnName)) {
      problems.push(`${tableName}.${columnName}: declared in types but absent from the database`);
    }
  }
}

for (const tableName of declared.keys()) {
  if (!database.has(tableName)) {
    problems.push(`${tableName}: declared in types/database.ts but absent from the database`);
  }
}

if (problems.length > 0) {
  console.error(`types/database.ts does not match ${databaseUrl}:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `types/database.ts matches the database (${checked.tables} relations, ${checked.columns} columns).`,
);
