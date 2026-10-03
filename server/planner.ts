import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  DIAS_SEMANA,
  DOPAMINA_INICIAL,
  ENTITY_KEYS,
  MAX_ANEXO_BYTES,
  diasDaSemana,
  getEntity,
  mesDaData,
  type EntityKey,
  type FieldSpec,
  type PlannerRow,
} from "@shared/planner";
import { getClient } from "./db";
import * as notifications from "./notifications";
import { columnsFor } from "./plannerSchema";

/**
 * Planner "Voe Alto. Seja leve.": CRUD genérico sobre as bases declaradas
 * em `shared/planner.ts`.
 *
 * Todo SQL filtra por userId. Os nomes de tabela e coluna vêm só da
 * especificação (nunca da entrada), e os valores vão sempre como
 * parâmetros — a entrada do cliente nunca vira texto de SQL.
 */

async function client() {
  const c = await getClient();
  if (!c) throw new Error("Database not available");
  return c;
}

const DATA_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Base64 de um arquivo de até MAX_ANEXO_BYTES. */
const MAX_BASE64 = Math.ceil(MAX_ANEXO_BYTES / 3) * 4;

function zodFor(field: FieldSpec): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (field.type) {
    case "text":
      base = field.required ? z.string().trim().min(1, `${field.label} é obrigatório`).max(500) : z.string().max(500);
      break;
    case "longtext":
      base = z.string().max(20000);
      break;
    case "date":
      base = z.string().regex(DATA_DIA, `${field.label}: use AAAA-MM-DD`);
      break;
    case "datetime":
      base = z.string().datetime({ offset: true });
      break;
    case "bool":
      return z.boolean();
    case "int":
      base = z.number().int().min(0).max(10_000_000);
      break;
    case "money":
      base = z.number().finite().min(0).max(1_000_000_000);
      break;
    case "rating":
      base = z.number().int().min(1).max(5);
      break;
    case "select":
      base = z.enum(field.options as [string, ...string[]]);
      break;
    case "multi":
      return z.array(z.enum(field.options as [string, ...string[]])).max(field.options!.length);
    case "url":
      // Só http(s): a URL vira link clicável, e "javascript:" executaria código.
      base = z.string().max(2000).url().refine((u) => /^https?:\/\//i.test(u), "Use um link http(s)");
      break;
    case "file":
      base = z.object({
        nome: z.string().min(1).max(255),
        tipo: z.string().max(100),
        dados: z.string().max(MAX_BASE64, "Anexo maior que 5 MB"),
      });
      break;
    case "relation":
      base = z.number().int().positive();
      break;
  }
  return field.required ? base : base.nullable();
}

function schemaFor(key: EntityKey, partial: boolean) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of getEntity(key).fields) {
    if (f.derived) continue;
    shape[f.key] = partial ? zodFor(f).optional() : f.required ? zodFor(f) : zodFor(f).optional();
  }
  return z.object(shape).strict();
}

function parse(key: EntityKey, data: unknown, partial: boolean): Record<string, unknown> {
  const result = schemaFor(key, partial).safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: issue ? `${issue.path.join(".") || "dados"}: ${issue.message}` : "Dados inválidos",
    });
  }
  return result.data;
}

/** Valor validado → colunas SQLite. */
function toColumns(field: FieldSpec, value: unknown): Record<string, unknown> {
  if (field.type === "file") {
    const v = value as { nome: string; tipo: string; dados: string } | null;
    return {
      [`${field.key}Nome`]: v?.nome ?? null,
      [`${field.key}Tipo`]: v?.tipo ?? null,
      [`${field.key}Dados`]: v?.dados ?? null,
    };
  }
  if (value === undefined || value === null || value === "") {
    return { [field.key]: field.type === "bool" ? 0 : null };
  }
  switch (field.type) {
    case "bool":
      return { [field.key]: value ? 1 : 0 };
    case "money":
      return { [field.key]: Math.round(Number(value) * 100) };
    case "multi":
      return { [field.key]: JSON.stringify(value) };
    default:
      return { [field.key]: value };
  }
}

/** Linha SQLite → objeto que o cliente recebe. */
function fromRow(key: EntityKey, row: Record<string, unknown>): PlannerRow {
  const out: PlannerRow = {
    id: row.id as number,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
  for (const f of getEntity(key).fields) {
    const v = row[f.key];
    switch (f.type) {
      case "bool":
        out[f.key] = !!v;
        break;
      case "money":
        out[f.key] = v === null || v === undefined ? null : Number(v) / 100;
        break;
      case "multi":
        out[f.key] = typeof v === "string" ? JSON.parse(v) : [];
        break;
      case "file": {
        const nome = row[`${f.key}Nome`];
        out[f.key] = nome ? { nome, tipo: row[`${f.key}Tipo`] } : null;
        break;
      }
      default:
        out[f.key] = v ?? null;
    }
  }
  return out;
}

/** Colunas lidas nas listagens — tudo menos o conteúdo dos anexos. */
function listColumns(key: EntityKey): string {
  const cols = ["id", "createdAt", "updatedAt"];
  for (const f of getEntity(key).fields) {
    for (const [c] of columnsFor(f)) if (!c.endsWith("Dados")) cols.push(c);
  }
  return cols.join(", ");
}

/** Uma relação só pode apontar para um registro do próprio usuário. */
async function assertRelationsOwned(userId: number, key: EntityKey, data: Record<string, unknown>) {
  const c = await client();
  for (const f of getEntity(key).fields) {
    if (f.type !== "relation" || data[f.key] === undefined || data[f.key] === null) continue;
    const alvo = getEntity(f.target as EntityKey);
    const existe = c
      .prepare(`SELECT 1 FROM ${alvo.table} WHERE id = ? AND userId = ?`)
      .get(data[f.key], userId);
    if (!existe) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `${f.label}: registro não encontrado` });
    }
  }
}

/** Campos calculados pelo servidor (hoje: o Mês das Finanças, a partir da Data). */
function derive(key: EntityKey, data: Record<string, unknown>): Record<string, unknown> {
  if ((key === "entradas" || key === "saidas") && typeof data.data === "string") {
    return { ...data, mes: mesDaData(data.data) };
  }
  return data;
}

function getRaw(c: Awaited<ReturnType<typeof client>>, key: EntityKey, userId: number, id: number) {
  const spec = getEntity(key);
  return c
    .prepare(`SELECT * FROM ${spec.table} WHERE id = ? AND userId = ?`)
    .get(id, userId) as Record<string, unknown> | undefined;
}

// ===== Lembretes → notificação agendada =====

async function agendarAlarme(userId: number, row: Record<string, unknown>): Promise<number | null> {
  if (typeof row.alarme !== "string") return null;
  const res = await notifications.createNotification({
    userId,
    type: "reminder",
    title: `⏰ ${row.name as string}`,
    body: row.categoria ? `Lembrete (${row.categoria as string})` : "Lembrete do Planner",
    icon: "⏰",
    data: { url: "/planner" },
    scheduledFor: new Date(row.alarme),
    sent: false,
    read: false,
  });
  const insertId = (res?.result as { insertId?: number } | undefined)?.insertId;
  return insertId ?? null;
}

async function cancelarAlarme(userId: number, notificationId: unknown) {
  if (typeof notificationId === "number") {
    await notifications.deleteNotification(userId, notificationId);
  }
}

// ===== CRUD =====

export async function list(userId: number, key: EntityKey): Promise<PlannerRow[]> {
  if (key === "dopamina") await seedDopamina(userId);
  const c = await client();
  const spec = getEntity(key);
  const rows = c
    .prepare(`SELECT ${listColumns(key)} FROM ${spec.table} WHERE userId = ? ORDER BY id ASC`)
    .all(userId) as Record<string, unknown>[];
  return rows.map((r) => fromRow(key, r));
}

export async function create(userId: number, key: EntityKey, input: unknown): Promise<PlannerRow> {
  const data = derive(key, parse(key, input, false));
  await assertRelationsOwned(userId, key, data);
  const c = await client();
  const spec = getEntity(key);
  const now = new Date().toISOString();
  const cols: Record<string, unknown> = { userId, createdAt: now, updatedAt: now };
  for (const f of spec.fields) Object.assign(cols, toColumns(f, data[f.key]));

  const names = Object.keys(cols);
  const info = c
    .prepare(`INSERT INTO ${spec.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`)
    .run(...names.map((n) => cols[n]));
  const id = Number(info.lastInsertRowid);

  if (key === "lembretes") {
    const notificationId = await agendarAlarme(userId, data);
    c.prepare(`UPDATE ${spec.table} SET notificationId = ? WHERE id = ?`).run(notificationId, id);
  }
  return fromRow(key, getRaw(c, key, userId, id)!);
}

export async function update(
  userId: number,
  key: EntityKey,
  id: number,
  input: unknown
): Promise<{ affectedRows: number; row?: PlannerRow }> {
  const data = derive(key, parse(key, input, true));
  await assertRelationsOwned(userId, key, data);
  const c = await client();
  const spec = getEntity(key);
  const antes = getRaw(c, key, userId, id);
  if (!antes) return { affectedRows: 0 };

  const cols: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const f of spec.fields) {
    if (data[f.key] !== undefined) Object.assign(cols, toColumns(f, data[f.key]));
  }
  const names = Object.keys(cols);
  const info = c
    .prepare(`UPDATE ${spec.table} SET ${names.map((n) => `${n} = ?`).join(", ")} WHERE id = ? AND userId = ?`)
    .run(...names.map((n) => cols[n]), id, userId);

  if (key === "lembretes" && (data.alarme !== undefined || data.name !== undefined || data.categoria !== undefined)) {
    await cancelarAlarme(userId, antes.notificationId);
    const atual = getRaw(c, key, userId, id)!;
    const notificationId = await agendarAlarme(userId, atual);
    c.prepare(`UPDATE ${spec.table} SET notificationId = ? WHERE id = ?`).run(notificationId, id);
  }
  return { affectedRows: info.changes, row: fromRow(key, getRaw(c, key, userId, id)!) };
}

/** Relações que apontam para cada base — ao apagar o pai, o vínculo some (como no Notion). */
function relacoesPara(key: EntityKey): { entity: EntityKey; field: string }[] {
  const out: { entity: EntityKey; field: string }[] = [];
  for (const k of ENTITY_KEYS) {
    for (const f of getEntity(k).fields) {
      if (f.type === "relation" && f.target === key) out.push({ entity: k, field: f.key });
    }
  }
  return out;
}

export async function remove(userId: number, key: EntityKey, id: number): Promise<{ affectedRows: number }> {
  const c = await client();
  const spec = getEntity(key);
  const antes = getRaw(c, key, userId, id);
  if (!antes) return { affectedRows: 0 };
  if (key === "lembretes") await cancelarAlarme(userId, antes.notificationId);

  const apagar = c.transaction(() => {
    for (const r of relacoesPara(key)) {
      c.prepare(`UPDATE ${getEntity(r.entity).table} SET ${r.field} = NULL WHERE ${r.field} = ? AND userId = ?`)
        .run(id, userId);
    }
    return c.prepare(`DELETE FROM ${spec.table} WHERE id = ? AND userId = ?`).run(id, userId).changes;
  });
  return { affectedRows: apagar() };
}

/** Conteúdo de um anexo de Estudos Gerais. */
export async function getFile(userId: number, id: number) {
  const c = await client();
  const row = getRaw(c, "estudos", userId, id);
  if (!row || !row.anexoDados) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Anexo não encontrado" });
  }
  return { nome: row.anexoNome as string, tipo: row.anexoTipo as string, dados: row.anexoDados as string };
}

// ===== Automação "Nova Semana" =====

/**
 * Botão "Nova Semana" do Rotina/Hábitos: uma linha por dia, de segunda a
 * domingo da semana de `hoje`, com o nome do dia. Dias que já têm linha
 * ficam como estão — apertar duas vezes não duplica nada.
 */
export async function novaSemana(userId: number, hoje: string) {
  const c = await client();
  const datas = diasDaSemana(hoje);
  const existentes = new Set(
    (c.prepare(`SELECT data FROM habit_days WHERE userId = ? AND data BETWEEN ? AND ?`)
      .all(userId, datas[0], datas[6]) as { data: string }[]).map((r) => r.data)
  );
  let criados = 0;
  for (let i = 0; i < 7; i++) {
    if (existentes.has(datas[i])) continue;
    await create(userId, "habitos", { name: DIAS_SEMANA[i], data: datas[i] });
    criados++;
  }
  return { criados, semana: datas };
}

// ===== Configurações (contador, pomodoro…) =====

export async function getSetting(userId: number, key: string): Promise<string | null> {
  const c = await client();
  const row = c.prepare(`SELECT value FROM planner_settings WHERE userId = ? AND key = ?`).get(userId, key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export async function setSetting(userId: number, key: string, value: string) {
  const c = await client();
  c.prepare(
    `INSERT INTO planner_settings (userId, key, value) VALUES (?, ?, ?)
     ON CONFLICT(userId, key) DO UPDATE SET value = excluded.value`
  ).run(userId, key, value);
  return { success: true } as const;
}

/**
 * Coloca os itens iniciais no Reservatório de Dopamina uma única vez.
 * Se a pessoa apagar todos depois, a lista fica vazia — não volta sozinha.
 */
async function seedDopamina(userId: number) {
  if (await getSetting(userId, "dopaminaSemeada")) return;
  await setSetting(userId, "dopaminaSemeada", "1");
  for (const item of DOPAMINA_INICIAL) await create(userId, "dopamina", item);
}

/** Tudo do Planner, para a tela de exportação. */
export async function exportAll(userId: number) {
  const out: Record<string, PlannerRow[]> = {};
  for (const k of ENTITY_KEYS) out[k] = await list(userId, k);
  return out;
}
