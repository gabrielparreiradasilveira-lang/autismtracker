import type BetterSqlite3 from "better-sqlite3";
import { ENTITY_KEYS, getEntity, type FieldSpec } from "@shared/planner";

/**
 * Colunas SQLite de um campo da especificação do Planner.
 *
 * Datas-dia ficam como TEXT "YYYY-MM-DD" (o dia de quem registrou, sem
 * fuso a converter); instantes como TEXT ISO-8601 em UTC, no mesmo padrão
 * das tabelas acessadas por SQL cru. Dinheiro fica em centavos inteiros
 * para a soma de um mês nunca errar por arredondamento de ponto flutuante.
 * Um anexo ocupa três colunas: nome, tipo MIME e conteúdo em base64.
 */
export function columnsFor(field: FieldSpec): [string, string][] {
  switch (field.type) {
    case "bool":
      return [[field.key, "INTEGER NOT NULL DEFAULT 0"]];
    case "int":
    case "rating":
    case "relation":
    case "money":
      return [[field.key, "INTEGER"]];
    case "file":
      return [
        [`${field.key}Nome`, "TEXT"],
        [`${field.key}Tipo`, "TEXT"],
        [`${field.key}Dados`, "TEXT"],
      ];
    default:
      return [[field.key, "TEXT"]];
  }
}

/** Colunas extras que não são propriedades do Notion, por tabela. */
const EXTRA_COLUMNS: Record<string, [string, string][]> = {
  // Notificação agendada do alarme, para ser trocada quando o alarme muda.
  planner_reminders: [["notificationId", "INTEGER"]],
};

/**
 * Cria (ou completa) as tabelas do Planner a partir de `shared/planner.ts`.
 *
 * Idempotente: `CREATE TABLE IF NOT EXISTS` para tabelas novas e
 * `ALTER TABLE ADD COLUMN` para propriedades acrescentadas depois que o
 * banco já existia — assim um campo novo na especificação chega a bancos
 * antigos sem migração manual.
 */
export function ensurePlannerSchema(client: BetterSqlite3.Database) {
  for (const key of ENTITY_KEYS) {
    const spec = getEntity(key);
    const cols: [string, string][] = [
      ["userId", "INTEGER NOT NULL"],
      ...spec.fields.flatMap(columnsFor),
      ...(EXTRA_COLUMNS[spec.table] ?? []),
      ["createdAt", "TEXT NOT NULL"],
      ["updatedAt", "TEXT NOT NULL"],
    ];
    client.exec(
      `CREATE TABLE IF NOT EXISTS ${spec.table} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  ` +
        cols.map(([n, t]) => `${n} ${t}`).join(",\n  ") +
        `\n);\nCREATE INDEX IF NOT EXISTS idx_${spec.table}_user ON ${spec.table}(userId);`
    );
    const existentes = new Set(
      (client.prepare(`PRAGMA table_info(${spec.table})`).all() as { name: string }[]).map((c) => c.name)
    );
    for (const [n, t] of cols) {
      if (!existentes.has(n)) {
        // NOT NULL sem DEFAULT não pode ser acrescentado a tabela com linhas.
        const tipo = t.includes("NOT NULL") && !t.includes("DEFAULT") ? t.replace(" NOT NULL", "") : t;
        client.exec(`ALTER TABLE ${spec.table} ADD COLUMN ${n} ${tipo}`);
      }
    }
  }

  client.exec(`
CREATE TABLE IF NOT EXISTS planner_settings (
  userId INTEGER NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (userId, key)
);`);
}
