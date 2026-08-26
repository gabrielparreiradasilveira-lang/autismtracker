import Database from "better-sqlite3";
import { and, desc, eq, gte, isNotNull, lte, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import fs from "fs";
import path from "path";
import {
  exerciseSessions,
  InsertExerciseSession,
  InsertMoodEntry,
  InsertReminder,
  InsertRoutine,
  InsertRoutineEntry,
  InsertSensoryTrigger,
  InsertSymptomEntry,
  InsertUser,
  InsertUserSettings,
  moodEntries,
  reminders,
  routineEntries,
  routines,
  sensoryTriggers,
  symptomEntries,
  techniques,
  userTechniques,
  users,
  userSettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { indexarGatilhos, normalizarGatilho } from "./triggerMatching";
import { MIGRATION_SQL } from "./migrations";
import { runSeeds } from "./seeds";

const dialect = new SQLiteSyncDialect();

/**
 * Compatibilidade com os módulos que usam SQL cru (gamification, notifications, crisis):
 * executa a query no better-sqlite3, devolvendo linhas para SELECT e
 * { insertId, affectedRows } para INSERT/UPDATE/DELETE — mesmo contrato do driver MySQL original.
 */
function makeExecute(client: Database.Database) {
  return async (query: SQL): Promise<any> => {
    const { sql: text, params } = dialect.sqlToQuery(query);
    const boundParams = params.map((p) => {
      if (p instanceof Date) return p.toISOString();
      if (typeof p === "boolean") return p ? 1 : 0;
      return p;
    });
    const stmt = client.prepare(text);
    if (stmt.reader) {
      return stmt.all(...boundParams);
    }
    const info = stmt.run(...boundParams);
    return { insertId: Number(info.lastInsertRowid), affectedRows: info.changes };
  };
}

export type AppDb = ReturnType<typeof drizzle> & { execute: (query: SQL) => Promise<any> };

let _db: AppDb | null = null;

export async function getDb(): Promise<AppDb | null> {
  if (!_db) {
    try {
      const dbPath = ENV.databasePath;
      if (dbPath !== ":memory:") {
        fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
      }
      const client = new Database(dbPath);
      client.pragma("journal_mode = WAL");
      client.exec(MIGRATION_SQL);
      runSeeds(client);
      const db = drizzle(client) as AppDb;
      db.execute = makeExecute(client);
      _db = db;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Users
export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(user).returning({ id: users.id });
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

// Mood Entries
export async function createMoodEntry(entry: InsertMoodEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(moodEntries).values(entry);
  return result;
}

export async function getMoodEntriesByUser(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(moodEntries).where(eq(moodEntries.userId, userId));

  if (startDate && endDate) {
    query = db.select().from(moodEntries).where(
      and(
        eq(moodEntries.userId, userId),
        gte(moodEntries.date, startDate),
        lte(moodEntries.date, endDate)
      )
    );
  } else if (startDate) {
    // Only startDate provided — filter from startDate to now
    query = db.select().from(moodEntries).where(
      and(
        eq(moodEntries.userId, userId),
        gte(moodEntries.date, startDate)
      )
    );
  }

  const result = await query.orderBy(desc(moodEntries.date));
  return result;
}

export async function deleteMoodEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(moodEntries).where(
    and(eq(moodEntries.id, id), eq(moodEntries.userId, userId))
  );
}

// Sensory Triggers
export async function createSensoryTrigger(trigger: InsertSensoryTrigger) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sensoryTriggers).values(trigger);
  return result;
}

export async function getSensoryTriggersByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(sensoryTriggers)
    .where(eq(sensoryTriggers.userId, userId))
    .orderBy(desc(sensoryTriggers.createdAt));
  return result;
}

/**
 * Marca no cadastro que estes gatilhos acabaram de acontecer.
 *
 * `lastOccurred` existe na tabela desde o início e só podia ser
 * preenchido à mão, na tela de Gatilhos — ou seja, ficava sempre vazio,
 * mesmo para quem registrava o gatilho todo dia em humor e sintomas.
 * Agora quem registra a ocorrência atualiza o cadastro.
 *
 * Nome que não existe no cadastro é ignorado em silêncio: o texto é
 * livre de propósito, e cadastrar não pode virar obrigação para
 * registrar.
 */
export async function touchTriggersByName(userId: number, nomes: string[], quando = new Date()) {
  if (nomes.length === 0) return { atualizados: 0 };

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cadastrados = await getSensoryTriggersByUser(userId);
  const indice = indexarGatilhos(cadastrados);

  const ids = new Set<number>();
  for (const nome of nomes) {
    const encontrado = indice.get(normalizarGatilho(nome));
    if (encontrado) ids.add(encontrado.id);
  }

  for (const id of ids) {
    await db.update(sensoryTriggers)
      .set({ lastOccurred: quando })
      .where(and(eq(sensoryTriggers.id, id), eq(sensoryTriggers.userId, userId)));
  }

  return { atualizados: ids.size };
}

export async function updateSensoryTrigger(id: number, userId: number, data: Partial<InsertSensoryTrigger>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sensoryTriggers)
    .set(data)
    .where(and(eq(sensoryTriggers.id, id), eq(sensoryTriggers.userId, userId)));
}

export async function deleteSensoryTrigger(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(sensoryTriggers).where(
    and(eq(sensoryTriggers.id, id), eq(sensoryTriggers.userId, userId))
  );
}

// Routines
export async function createRoutine(routine: InsertRoutine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(routines).values(routine);
  return result;
}

export async function getRoutinesByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(routines)
    .where(eq(routines.userId, userId))
    .orderBy(desc(routines.createdAt));
  return result;
}

export async function updateRoutine(id: number, userId: number, data: Partial<InsertRoutine>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(routines)
    .set(data)
    .where(and(eq(routines.id, id), eq(routines.userId, userId)));
}

export async function deleteRoutine(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(routines).where(
    and(eq(routines.id, id), eq(routines.userId, userId))
  );
}

// Routine Entries
export async function createRoutineEntry(entry: InsertRoutineEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(routineEntries).values(entry);
  return result;
}

export async function getRoutineEntriesByUser(userId: number, routineId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(routineEntries).where(eq(routineEntries.userId, userId));

  if (routineId) {
    query = db.select().from(routineEntries).where(
      and(eq(routineEntries.userId, userId), eq(routineEntries.routineId, routineId))
    );
  }

  const result = await query.orderBy(desc(routineEntries.date));
  return result;
}

export async function updateRoutineEntry(id: number, userId: number, data: Partial<InsertRoutineEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(routineEntries)
    .set(data)
    .where(and(eq(routineEntries.id, id), eq(routineEntries.userId, userId)));
}

// Exercise Sessions
export async function createExerciseSession(session: InsertExerciseSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(exerciseSessions).values(session);
  return result;
}

export async function getExerciseSessionsByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(exerciseSessions)
    .where(eq(exerciseSessions.userId, userId))
    .orderBy(desc(exerciseSessions.startedAt));
  return result;
}

// User Settings
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertUserSettings(userId: number, settings: Partial<InsertUserSettings>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserSettings(userId);

  if (existing) {
    await db.update(userSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      ...settings
    } as InsertUserSettings);
  }
}


// ===== Reminders Functions =====

export async function createReminder(reminder: Omit<InsertReminder, 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(reminders).values(reminder as InsertReminder);
}

export async function getUserReminders(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(reminders)
    .where(and(
      eq(reminders.userId, userId),
      eq(reminders.isActive, true)
    ))
    .orderBy(desc(reminders.createdAt));
}

export async function updateReminder(id: number, userId: number, updates: Partial<InsertReminder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reminders)
    .set(updates)
    .where(and(
      eq(reminders.id, id),
      eq(reminders.userId, userId)
    ));
}

export async function deleteReminder(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(reminders)
    .set({ isActive: false })
    .where(and(
      eq(reminders.id, id),
      eq(reminders.userId, userId)
    ));
}

export async function recordReminderResponse(id: number, userId: number, responseTime: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current reminder
  const reminder = await db.select().from(reminders)
    .where(and(
      eq(reminders.id, id),
      eq(reminders.userId, userId)
    ))
    .limit(1);

  if (reminder.length === 0) return;

  const current = reminder[0];

  // Extract hour from response time
  const hour = responseTime.getHours();
  const minute = responseTime.getMinutes();
  const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  // Update preferred times if smart reminder
  let preferredTimes = current.preferredTimes || [];
  if (current.isSmart) {
    preferredTimes = [...preferredTimes, timeString];
    // Keep only last 10 response times
    if (preferredTimes.length > 10) {
      preferredTimes = preferredTimes.slice(-10);
    }
  }

  await db.update(reminders)
    .set({
      lastTriggered: responseTime,
      responseCount: (current.responseCount || 0) + 1,
      preferredTimes: preferredTimes.length > 0 ? preferredTimes : null,
    })
    .where(eq(reminders.id, id));
}

/**
 * Sugere horários de lembrete a partir das horas em que a pessoa costuma
 * registrar humor.
 *
 * A hora tem que ser lida no relógio dela: com `getHours()` do servidor,
 * que no Railway roda em UTC, quem registrava às 20h no Brasil recebia a
 * sugestão de lembrete para as 23h.
 */
export async function getSmartReminderSuggestions(userId: number, timezoneOffsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all mood entries to analyze patterns
  const entries = await db.select().from(moodEntries)
    .where(eq(moodEntries.userId, userId))
    .orderBy(desc(moodEntries.date))
    .limit(100);

  if (entries.length < 7) {
    return {
      hasSufficientData: false,
      message: "Continue registrando seu humor para receber sugestões personalizadas de lembretes.",
      suggestions: [],
    };
  }

  // Analyze most common hours for mood entries
  const hourCounts: Record<number, number> = {};
  entries.forEach(entry => {
    const hour = toUserWallClock(timezoneOffsetMinutes, new Date(entry.date)).getUTCHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  // Find top 3 most common hours
  const topHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  const suggestions = topHours.map(hour => ({
    time: `${hour.toString().padStart(2, '0')}:00`,
    reason: `Você costuma registrar seu humor por volta deste horário`,
    frequency: hourCounts[hour],
  }));

  return {
    hasSufficientData: true,
    message: "Baseado nos seus registros, sugerimos os seguintes horários para lembretes:",
    suggestions,
  };
}


// ===== Routine Analytics Functions =====

export async function getRoutineProgress(
  userId: number,
  timezoneOffsetMinutes: number,
  routineId?: number,
  period: "week" | "month" = "week"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const days = period === "week" ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      gte(routineEntries.date, startDate)
    ))
    .orderBy(desc(routineEntries.date));

  if (routineId) {
    query = db.select().from(routineEntries)
      .where(and(
        eq(routineEntries.userId, userId),
        eq(routineEntries.routineId, routineId),
        gte(routineEntries.date, startDate)
      ))
      .orderBy(desc(routineEntries.date));
  }

  const entries = await query;

  // Calculate daily completion rate
  const dailyData: Record<string, { completed: number; total: number }> = {};

  entries.forEach(entry => {
    const dateKey = getUserDayKey(timezoneOffsetMinutes, new Date(entry.date));
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { completed: 0, total: 0 };
    }
    dailyData[dateKey].total++;
    if (entry.completed) {
      dailyData[dateKey].completed++;
    }
  });

  const chartData = Object.entries(dailyData).map(([date, data]) => ({
    date,
    completionRate: Math.round((data.completed / data.total) * 100),
    completed: data.completed,
    total: data.total,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period,
    chartData,
    totalEntries: entries.length,
    completedEntries: entries.filter(e => e.completed).length,
    completionRate: entries.length > 0
      ? Math.round((entries.filter(e => e.completed).length / entries.length) * 100)
      : 0,
  };
}

export async function getRoutineStreaks(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userRoutines = await db.select().from(routines)
    .where(and(
      eq(routines.userId, userId),
      eq(routines.isActive, true)
    ));

  return userRoutines.map(routine => ({
    id: routine.id,
    title: routine.title,
    currentStreak: routine.currentStreak,
    longestStreak: routine.longestStreak,
    totalCompletions: routine.totalCompletions,
    points: routine.points,
  }));
}

export async function getRoutineMoodCorrelations(userId: number, timezoneOffsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get last 30 days of data
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const routineData = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      gte(routineEntries.date, startDate)
    ));

  const moodData = await db.select().from(moodEntries)
    .where(and(
      eq(moodEntries.userId, userId),
      gte(moodEntries.date, startDate)
    ));

  /**
   * Um registro por dia, montado pela UNIÃO das duas fontes.
   *
   * Antes o dia só existia se houvesse linha de rotina, e o humor era
   * copiado por cima (`avgMood = entry.moodLevel`). Isso produzia dois
   * erros no número de manchete desta análise: com dois registros de
   * humor no mesmo dia valia o último lido, e o dia em que a pessoa
   * registrou humor sem tocar em rotina nenhuma sumia — justamente um
   * dia "sem rotina", o grupo de comparação.
   */
  type DiaAgregado = {
    routinesCompleted: number;
    moodSum: number;
    moodCount: number;
    anxietySum: number;
  };
  const dailyData: Record<string, DiaAgregado> = {};

  const diaDe = (chave: string) => {
    if (!dailyData[chave]) {
      dailyData[chave] = { routinesCompleted: 0, moodSum: 0, moodCount: 0, anxietySum: 0 };
    }
    return dailyData[chave];
  };

  routineData.forEach(entry => {
    const dia = diaDe(getUserDayKey(timezoneOffsetMinutes, new Date(entry.date)));
    if (entry.completed) {
      dia.routinesCompleted++;
    }
  });

  moodData.forEach(entry => {
    const dia = diaDe(getUserDayKey(timezoneOffsetMinutes, new Date(entry.date)));
    dia.moodSum += entry.moodLevel;
    dia.anxietySum += entry.anxietyLevel;
    dia.moodCount++;
  });

  // Só entram dias com humor registrado: sem humor não há o que comparar.
  const daysWithBothData = Object.values(dailyData)
    .filter(d => d.moodCount > 0)
    .map(d => ({
      routinesCompleted: d.routinesCompleted,
      avgMood: d.moodSum / d.moodCount,
      avgAnxiety: d.anxietySum / d.moodCount,
    }));

  const MIN_DAYS = 5;
  if (daysWithBothData.length < MIN_DAYS) {
    return {
      hasSufficientData: false as const,
      message: "Continue registrando suas rotinas e humor para ver correlações.",
      correlations: [],
      daysAnalyzed: daysWithBothData.length,
      daysWithRoutines: 0,
      daysWithoutRoutines: 0,
      minDays: MIN_DAYS,
      avgMoodWithRoutines: null,
      avgMoodWithoutRoutines: null,
      avgAnxietyWithRoutines: null,
      avgAnxietyWithoutRoutines: null,
    };
  }

  const withRoutines = daysWithBothData.filter(d => d.routinesCompleted > 0);
  const withoutRoutines = daysWithBothData.filter(d => d.routinesCompleted === 0);

  // Média protegida: comparar grupos exige que ambos existam. Antes, um
  // usuário que completou rotina em todos os dias registrados produzia
  // 0/0 = NaN aqui.
  const average = (days: typeof daysWithBothData, pick: (d: (typeof daysWithBothData)[number]) => number) =>
    days.length > 0 ? days.reduce((sum, d) => sum + pick(d), 0) / days.length : null;

  const avgMoodWithRoutines = average(withRoutines, d => d.avgMood);
  const avgMoodWithoutRoutines = average(withoutRoutines, d => d.avgMood);
  const avgAnxietyWithRoutines = average(withRoutines, d => d.avgAnxiety);
  const avgAnxietyWithoutRoutines = average(withoutRoutines, d => d.avgAnxiety);

  const round = (n: number | null) => (n == null ? null : Math.round(n * 10) / 10);

  const moodImprovement =
    avgMoodWithRoutines != null && avgMoodWithoutRoutines != null
      ? avgMoodWithRoutines - avgMoodWithoutRoutines
      : null;

  return {
    hasSufficientData: true as const,
    message: "Análise dos últimos 30 dias",
    correlations: moodImprovement == null ? [] : [
      {
        metric: "Humor",
        withRoutines: round(avgMoodWithRoutines)!,
        withoutRoutines: round(avgMoodWithoutRoutines)!,
        improvement: Math.round(moodImprovement * 10) / 10,
        impact: moodImprovement > 1 ? "Positivo" : moodImprovement < -1 ? "Negativo" : "Neutro",
      },
    ],
    daysAnalyzed: daysWithBothData.length,
    daysWithRoutines: withRoutines.length,
    daysWithoutRoutines: withoutRoutines.length,
    minDays: MIN_DAYS,
    avgMoodWithRoutines: round(avgMoodWithRoutines),
    avgMoodWithoutRoutines: round(avgMoodWithoutRoutines),
    avgAnxietyWithRoutines: round(avgAnxietyWithRoutines),
    avgAnxietyWithoutRoutines: round(avgAnxietyWithoutRoutines),
  };
}

export async function getBestRoutineTimes(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const entries = await db.select().from(routineEntries)
    .innerJoin(routines, eq(routineEntries.routineId, routines.id))
    .where(and(
      eq(routineEntries.userId, userId),
      eq(routineEntries.completed, true)
    ))
    .limit(100);

  // Count completions by time of day
  const timeStats: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  };

  entries.forEach(({ routines: routine }) => {
    if (routine.timeOfDay in timeStats) {
      timeStats[routine.timeOfDay]++;
    }
  });

  const bestTimes = Object.entries(timeStats)
    .map(([time, count]) => ({
      timeOfDay: time,
      completions: count,
      label: time === 'morning' ? 'Manhã' :
             time === 'afternoon' ? 'Tarde' :
             time === 'evening' ? 'Noite' : 'Madrugada',
    }))
    .sort((a, b) => b.completions - a.completions);

  return {
    bestTimes,
    recommendation: bestTimes[0]?.label || "Manhã",
  };
}

export async function getRoutineAdhesion(userId: number, period: "week" | "month" = "month") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const days = period === "week" ? 7 : 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const entries = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      gte(routineEntries.date, startDate)
    ));

  const totalEntries = entries.length;
  const completedEntries = entries.filter(e => e.completed).length;
  const adhesionRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

  // Calculate weekly breakdown
  const weeklyData: Record<number, { completed: number; total: number }> = {};

  entries.forEach(entry => {
    const weekNum = Math.floor((new Date().getTime() - new Date(entry.date).getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (!weeklyData[weekNum]) {
      weeklyData[weekNum] = { completed: 0, total: 0 };
    }
    weeklyData[weekNum].total++;
    if (entry.completed) {
      weeklyData[weekNum].completed++;
    }
  });

  return {
    period,
    adhesionRate: Math.round(adhesionRate),
    totalEntries,
    completedEntries,
    weeklyBreakdown: Object.entries(weeklyData).map(([week, data]) => ({
      week: parseInt(week),
      rate: Math.round((data.completed / data.total) * 100),
    })),
  };
}

export async function getUserRoutineStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userRoutines = await db.select().from(routines)
    .where(eq(routines.userId, userId));

  const totalPoints = userRoutines.reduce((sum, r) => sum + (r.totalCompletions * r.points), 0);
  const totalRoutines = userRoutines.length;
  const activeRoutines = userRoutines.filter(r => r.isActive).length;
  const bestStreak = Math.max(...userRoutines.map(r => r.longestStreak), 0);
  const totalCompletions = userRoutines.reduce((sum, r) => sum + r.totalCompletions, 0);

  return {
    totalPoints,
    totalRoutines,
    activeRoutines,
    bestStreak,
    totalCompletions,
    level: Math.floor(totalPoints / 100) + 1,
  };
}


// ===== Self-Regulation Technique Library Functions =====

export async function getTechniques(filters?: { category?: string; difficulty?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(techniques.isPublic, true)];
  if (filters?.category) conditions.push(eq(techniques.category, filters.category));
  if (filters?.difficulty) conditions.push(eq(techniques.difficulty, filters.difficulty));

  return await db.select().from(techniques)
    .where(and(...conditions))
    .orderBy(techniques.category, techniques.difficulty);
}

export async function getUserTechniquesByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(userTechniques)
    .where(eq(userTechniques.userId, userId));
}

export async function toggleFavoriteTechnique(userId: number, techniqueId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(userTechniques)
    .where(and(eq(userTechniques.userId, userId), eq(userTechniques.techniqueId, techniqueId)))
    .limit(1);

  if (existing.length > 0) {
    const newValue = !existing[0].isFavorite;
    await db.update(userTechniques)
      .set({ isFavorite: newValue })
      .where(eq(userTechniques.id, existing[0].id));
    return { isFavorite: newValue };
  }

  await db.insert(userTechniques).values({
    userId,
    techniqueId,
    isFavorite: true,
  });
  return { isFavorite: true };
}

export async function logTechniqueUsage(
  userId: number,
  techniqueId: number,
  effectiveness: number,
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(userTechniques)
    .where(and(eq(userTechniques.userId, userId), eq(userTechniques.techniqueId, techniqueId)))
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    await db.update(userTechniques)
      .set({
        effectiveness,
        notes: notes ?? existing[0].notes,
        usageCount: existing[0].usageCount + 1,
        lastUsed: now,
      })
      .where(eq(userTechniques.id, existing[0].id));
    return { usageCount: existing[0].usageCount + 1 };
  }

  await db.insert(userTechniques).values({
    userId,
    techniqueId,
    effectiveness,
    notes,
    usageCount: 1,
    lastUsed: now,
  });
  return { usageCount: 1 };
}

// ===== Gamification Support Functions =====
// (raw badge/points/challenge bookkeeping itself lives in server/gamification.ts;
// these are the Drizzle-backed counting helpers it needs to decide when to award them)

export async function countMoodEntriesInRange(userId: number, startDate: Date, endDate: Date) {
  const entries = await getMoodEntriesByUser(userId, startDate, endDate);
  return entries.length;
}

export async function countCompletedRoutineEntriesInRange(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      eq(routineEntries.completed, true),
      gte(routineEntries.date, startDate),
      lte(routineEntries.date, endDate)
    ));
  return result.length;
}

export async function countExerciseSessionsInRange(
  userId: number,
  exerciseType: string,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select().from(exerciseSessions)
    .where(and(
      eq(exerciseSessions.userId, userId),
      eq(exerciseSessions.exerciseType, exerciseType),
      eq(exerciseSessions.completed, true),
      gte(exerciseSessions.startedAt, startDate),
      lte(exerciseSessions.startedAt, endDate)
    ));
  return result.length;
}

/**
 * Number of distinct local days (UTC-based) with at least one mood entry,
 * counting backwards from today without gaps. Used to unlock the
 * "Semana Consciente" badge at 7 consecutive days.
 */
export async function getMoodStreak(userId: number, timezoneOffsetMinutes: number) {
  const entries = await getMoodEntriesByUser(userId);
  if (entries.length === 0) return 0;

  const daySet = new Set<number>();
  for (const entry of entries) {
    const { start } = getUserDayRange(timezoneOffsetMinutes, new Date(entry.date));
    daySet.add(start.getTime());
  }

  const { start: todayStart } = getUserDayRange(timezoneOffsetMinutes);
  let streak = 0;
  let expected = todayStart.getTime();
  while (daySet.has(expected)) {
    streak++;
    expected -= 24 * 60 * 60 * 1000;
  }
  return streak;
}

// ===== Symptom Monitoring Functions =====

export async function createSymptomEntry(entry: InsertSymptomEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(symptomEntries).values(entry).returning({ id: symptomEntries.id });
  return result[0];
}

export async function getSymptomEntriesByUser(
  userId: number,
  filters?: { symptomType?: string; days?: number }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(symptomEntries.userId, userId)];

  if (filters?.symptomType) {
    conditions.push(eq(symptomEntries.symptomType, filters.symptomType));
  }

  if (filters?.days) {
    const since = new Date();
    since.setDate(since.getDate() - filters.days);
    conditions.push(gte(symptomEntries.date, since));
  }

  return await db.select().from(symptomEntries)
    .where(and(...conditions))
    .orderBy(desc(symptomEntries.date));
}

export async function deleteSymptomEntry(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(symptomEntries).where(
    and(eq(symptomEntries.id, id), eq(symptomEntries.userId, userId))
  );
}

/**
 * Atualiza um registro de sintoma do próprio usuário.
 *
 * O filtro por userId acompanha o padrão das demais mutations por id.
 * Devolve quantas linhas mudaram para o router poder recusar o que não
 * pertence a quem pediu.
 */
export async function updateSymptomEntry(
  id: number,
  userId: number,
  data: Partial<Omit<InsertSymptomEntry, "id" | "userId">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(symptomEntries)
    .set(data)
    .where(and(eq(symptomEntries.id, id), eq(symptomEntries.userId, userId)))
    .returning({ id: symptomEntries.id });

  return { affectedRows: result.length };
}

export async function getSymptomAnalytics(
  userId: number,
  timezoneOffsetMinutes: number,
  days: number = 30
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const entries = await db.select().from(symptomEntries)
    .where(and(eq(symptomEntries.userId, userId), gte(symptomEntries.date, startDate)))
    .orderBy(desc(symptomEntries.date));

  const byType: Record<string, { total: number; count: number }> = {};
  const byDay: Record<string, { total: number; count: number }> = {};
  const triggerCounts: Record<string, number> = {};
  // Severidade acumulada por gatilho, para responder "quais gatilhos
  // acompanham os sintomas mais intensos" — e não apenas os mais comuns.
  const triggerSeverity: Record<string, { total: number; count: number }> = {};
  // Efetividade por tipo de sintoma: qual tipo mais responde a intervenção.
  const effectivenessByType: Record<string, { total: number; count: number }> = {};
  // Severidade por dia da semana (0=domingo), para revelar padrões semanais.
  const byWeekday: Record<number, { total: number; count: number }> = {};
  // Duração por tipo de sintoma.
  const durationByType: Record<string, { total: number; count: number }> = {};
  let effectivenessTotal = 0;
  let effectivenessCount = 0;
  let durationTotal = 0;
  let durationCount = 0;

  for (const entry of entries) {
    if (!byType[entry.symptomType]) byType[entry.symptomType] = { total: 0, count: 0 };
    byType[entry.symptomType].total += entry.severity;
    byType[entry.symptomType].count++;

    const relogioDoUsuario = toUserWallClock(timezoneOffsetMinutes, new Date(entry.date));

    const dayKey = relogioDoUsuario.toISOString().split("T")[0];
    if (!byDay[dayKey]) byDay[dayKey] = { total: 0, count: 0 };
    byDay[dayKey].total += entry.severity;
    byDay[dayKey].count++;

    const weekday = relogioDoUsuario.getUTCDay();
    if (!byWeekday[weekday]) byWeekday[weekday] = { total: 0, count: 0 };
    byWeekday[weekday].total += entry.severity;
    byWeekday[weekday].count++;

    if (entry.effectiveness != null) {
      effectivenessTotal += entry.effectiveness;
      effectivenessCount++;

      if (!effectivenessByType[entry.symptomType]) {
        effectivenessByType[entry.symptomType] = { total: 0, count: 0 };
      }
      effectivenessByType[entry.symptomType].total += entry.effectiveness;
      effectivenessByType[entry.symptomType].count++;
    }

    if (entry.duration != null) {
      durationTotal += entry.duration;
      durationCount++;

      if (!durationByType[entry.symptomType]) {
        durationByType[entry.symptomType] = { total: 0, count: 0 };
      }
      durationByType[entry.symptomType].total += entry.duration;
      durationByType[entry.symptomType].count++;
    }

    for (const trigger of entry.triggers || []) {
      triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      if (!triggerSeverity[trigger]) triggerSeverity[trigger] = { total: 0, count: 0 };
      triggerSeverity[trigger].total += entry.severity;
      triggerSeverity[trigger].count++;
    }
  }

  const averageSeverityByType = Object.entries(byType).map(([symptomType, data]) => ({
    symptomType,
    averageSeverity: Math.round((data.total / data.count) * 10) / 10,
    count: data.count,
  }));

  const severityTrend = Object.entries(byDay)
    .map(([date, data]) => ({
      date,
      averageSeverity: Math.round((data.total / data.count) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const topTriggers = Object.entries(triggerCounts)
    .map(([trigger, count]) => ({
      trigger,
      count,
      averageSeverity: triggerSeverity[trigger]
        ? Math.round((triggerSeverity[trigger].total / triggerSeverity[trigger].count) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const effectivenessBySymptomType = Object.entries(effectivenessByType).map(
    ([symptomType, data]) => ({
      symptomType,
      averageEffectiveness: Math.round((data.total / data.count) * 10) / 10,
      count: data.count,
    })
  );

  const severityByWeekday = Object.entries(byWeekday).map(([weekday, data]) => ({
    weekday: Number(weekday),
    averageSeverity: Math.round((data.total / data.count) * 10) / 10,
    count: data.count,
  }));

  const durationBySymptomType = Object.entries(durationByType).map(([symptomType, data]) => ({
    symptomType,
    averageDuration: Math.round(data.total / data.count),
    count: data.count,
  }));

  return {
    totalEntries: entries.length,
    averageSeverityByType,
    severityTrend,
    averageEffectiveness: effectivenessCount > 0
      ? Math.round((effectivenessTotal / effectivenessCount) * 10) / 10
      : null,
    interventionsLoggedCount: effectivenessCount,
    topTriggers,
    effectivenessBySymptomType,
    severityByWeekday,
    durationBySymptomType,
    averageDuration: durationCount > 0 ? Math.round(durationTotal / durationCount) : null,
    durationLoggedCount: durationCount,
  };
}

/**
 * Compares average mood on days with a high-severity symptom (>=7) against
 * days with only lower-severity symptoms, mirroring the shape of
 * getRoutineMoodCorrelations for the routine<->mood pairing.
 */
export async function getSymptomMoodCorrelation(
  userId: number,
  timezoneOffsetMinutes: number,
  days: number = 30
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const symptomData = await db.select().from(symptomEntries)
    .where(and(eq(symptomEntries.userId, userId), gte(symptomEntries.date, startDate)));

  const moodData = await db.select().from(moodEntries)
    .where(and(eq(moodEntries.userId, userId), gte(moodEntries.date, startDate)));

  /**
   * Aqui o dia precisa mesmo das duas fontes: sem sintoma não há
   * severidade para classificar o dia, e sem humor não há o que comparar.
   * O que estava errado era só a média — o humor era copiado por cima, de
   * modo que dois registros no mesmo dia viravam "o último lido".
   */
  const dailyData: Record<string, { maxSeverity: number; moodSum: number; moodCount: number }> = {};

  for (const entry of symptomData) {
    const dateKey = getUserDayKey(timezoneOffsetMinutes, new Date(entry.date));
    if (!dailyData[dateKey]) dailyData[dateKey] = { maxSeverity: 0, moodSum: 0, moodCount: 0 };
    dailyData[dateKey].maxSeverity = Math.max(dailyData[dateKey].maxSeverity, entry.severity);
  }

  for (const entry of moodData) {
    const dateKey = getUserDayKey(timezoneOffsetMinutes, new Date(entry.date));
    if (dailyData[dateKey]) {
      dailyData[dateKey].moodSum += entry.moodLevel;
      dailyData[dateKey].moodCount++;
    }
  }

  const daysWithBoth = Object.values(dailyData)
    .filter((d) => d.moodCount > 0)
    .map((d) => ({ maxSeverity: d.maxSeverity, avgMood: d.moodSum / d.moodCount }));

  if (daysWithBoth.length < 3) {
    return {
      hasSufficientData: false,
      message: "Continue registrando sintomas e humor para ver correlações.",
      avgMoodHighSeverity: null,
      avgMoodLowSeverity: null,
      highSeverityDayCount: 0,
      lowSeverityDayCount: 0,
    };
  }

  const highSeverityDays = daysWithBoth.filter((d) => d.maxSeverity >= 7);
  const lowSeverityDays = daysWithBoth.filter((d) => d.maxSeverity < 7);

  const avgMoodHighSeverity = highSeverityDays.length > 0
    ? highSeverityDays.reduce((sum, d) => sum + d.avgMood, 0) / highSeverityDays.length
    : null;
  const avgMoodLowSeverity = lowSeverityDays.length > 0
    ? lowSeverityDays.reduce((sum, d) => sum + d.avgMood, 0) / lowSeverityDays.length
    : null;

  return {
    hasSufficientData: true,
    message: `Análise dos últimos ${days} dias`,
    avgMoodHighSeverity: avgMoodHighSeverity != null ? Math.round(avgMoodHighSeverity * 10) / 10 : null,
    avgMoodLowSeverity: avgMoodLowSeverity != null ? Math.round(avgMoodLowSeverity * 10) / 10 : null,
    highSeverityDayCount: highSeverityDays.length,
    lowSeverityDayCount: lowSeverityDays.length,
  };
}

/**
 * Efetividade dos exercícios de respiração, por padrão respiratório.
 *
 * A coluna `rating` existe desde o começo e nunca foi preenchida: a tela
 * de respiração salvava a sessão sem jamais perguntar se tinha ajudado.
 * Com a pergunta no fim da sessão, dá para responder qual padrão funciona
 * melhor para esta pessoa em vez de listar os três como equivalentes.
 */
export async function getExerciseAnalytics(userId: number) {
  const sessions = await getExerciseSessionsByUser(userId);
  const concluidas = sessions.filter((s) => s.completed);

  const porPadrao: Record<string, { notaSoma: number; notaCount: number; duracaoSoma: number; total: number }> = {};

  for (const sessao of concluidas) {
    // Sessão sem padrão anotado ainda conta no total; só não entra no
    // ranking por padrão, que é o que a análise compara.
    const chave = sessao.pattern;
    if (!chave) continue;
    if (!porPadrao[chave]) {
      porPadrao[chave] = { notaSoma: 0, notaCount: 0, duracaoSoma: 0, total: 0 };
    }
    porPadrao[chave].total++;
    porPadrao[chave].duracaoSoma += sessao.duration;
    if (sessao.rating != null) {
      porPadrao[chave].notaSoma += sessao.rating;
      porPadrao[chave].notaCount++;
    }
  }

  const byPattern = Object.entries(porPadrao)
    .map(([pattern, d]) => ({
      pattern,
      sessions: d.total,
      ratedSessions: d.notaCount,
      averageRating: d.notaCount > 0 ? Math.round((d.notaSoma / d.notaCount) * 10) / 10 : null,
      averageDurationSeconds: Math.round(d.duracaoSoma / d.total),
    }))
    .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1));

  const avaliadas = concluidas.filter((s) => s.rating != null);

  return {
    totalSessions: concluidas.length,
    ratedSessions: avaliadas.length,
    averageRating:
      avaliadas.length > 0
        ? Math.round(
            (avaliadas.reduce((soma, s) => soma + (s.rating ?? 0), 0) / avaliadas.length) * 10
          ) / 10
        : null,
    totalSeconds: concluidas.reduce((soma, s) => soma + s.duration, 0),
    byPattern,
  };
}

export async function getTechniqueAnalytics(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(userTechniques)
    .innerJoin(techniques, eq(userTechniques.techniqueId, techniques.id))
    .where(and(eq(userTechniques.userId, userId), gte(userTechniques.usageCount, 1)));

  const items = rows.map(({ techniques: technique, user_techniques: ut }) => ({
    id: technique.id,
    title: technique.title,
    category: technique.category,
    usageCount: ut.usageCount,
    effectiveness: ut.effectiveness,
    lastUsed: ut.lastUsed,
  }));

  const mostUsed = [...items].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);

  const withEffectiveness = items.filter((i) => i.effectiveness != null);
  const mostEffective = [...withEffectiveness]
    .sort((a, b) => (b.effectiveness ?? 0) - (a.effectiveness ?? 0))
    .slice(0, 5);

  return {
    totalTechniquesUsed: items.length,
    totalUsageCount: items.reduce((sum, i) => sum + i.usageCount, 0),
    averageEffectiveness: withEffectiveness.length > 0
      ? Math.round(
          (withEffectiveness.reduce((sum, i) => sum + (i.effectiveness ?? 0), 0) / withEffectiveness.length) * 10
        ) / 10
      : null,
    mostUsed,
    mostEffective,
  };
}

export async function getUserFavoriteTechniques(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(userTechniques)
    .innerJoin(techniques, eq(userTechniques.techniqueId, techniques.id))
    .where(and(eq(userTechniques.userId, userId), eq(userTechniques.isFavorite, true)));

  return rows.map(({ techniques: technique, user_techniques: userTechnique }) => ({
    ...technique,
    isFavorite: userTechnique.isFavorite,
    effectiveness: userTechnique.effectiveness,
    notes: userTechnique.notes,
    usageCount: userTechnique.usageCount,
    lastUsed: userTechnique.lastUsed,
  }));
}


// ===== Routine Task Completion Functions =====

/**
 * Bumps totalCompletions/streak on the routine row. Only called when a
 * day's entry newly becomes fully completed, so it can't double-count from
 * repeated task toggles; unchecking a task after completion does not
 * decrement, since retroactively undoing a streak is its own can of worms.
 *
 * Day boundaries are computed in the user's own local timezone, not the
 * server's: the server runs in UTC while users are typically UTC-3, so a
 * naive `setHours(0,0,0,0)` on the server clock resolves "today" up to a
 * few hours away from the user's actual local day. Callers pass
 * `timezoneOffsetMinutes` — the value of `Date.prototype.getTimezoneOffset()`
 * from the user's browser — so the boundary matches their real midnight.
 */
export function getUserDayRange(timezoneOffsetMinutes: number, reference: Date = new Date()) {
  const offsetMs = timezoneOffsetMinutes * 60 * 1000;
  // Shift the instant into the user's local wall-clock time, expressed as
  // if it were UTC, so we can zero out hours/minutes/seconds safely.
  const localWallClock = new Date(reference.getTime() - offsetMs);
  localWallClock.setUTCHours(0, 0, 0, 0);
  // Shift back to the real UTC instant that corresponds to the user's
  // local midnight.
  const start = new Date(localWallClock.getTime() + offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * O mesmo instante lido no relógio de parede do usuário — devolvido como
 * um Date cujos campos UTC já são a hora local dele. Serve para agrupar:
 * `.toISOString().split("T")[0]` dá o dia, `.getUTCDay()` o dia da
 * semana e `.getUTCHours()` a hora, todos no fuso certo.
 *
 * Existe porque as análises agrupavam com `toISOString()` direto sobre o
 * instante em UTC. Com o servidor no Railway (UTC) e o usuário em UTC-3,
 * tudo que fosse registrado a partir das 21h contava no dia seguinte.
 */
export function toUserWallClock(timezoneOffsetMinutes: number, date: Date) {
  return new Date(date.getTime() - timezoneOffsetMinutes * 60 * 1000);
}

/** Chave "AAAA-MM-DD" do dia do usuário, para agrupar por dia. */
export function getUserDayKey(timezoneOffsetMinutes: number, date: Date) {
  return toUserWallClock(timezoneOffsetMinutes, date).toISOString().split("T")[0];
}

async function recordRoutineCompletion(userId: number, routineId: number, timezoneOffsetMinutes: number) {
  const db = await getDb();
  if (!db) return;

  const routineRows = await db.select().from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .limit(1);
  if (routineRows.length === 0) return;
  const routine = routineRows[0];

  const { start: todayStart } = getUserDayRange(timezoneOffsetMinutes);

  const priorCompletions = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.routineId, routineId),
      eq(routineEntries.userId, userId),
      eq(routineEntries.completed, true)
    ))
    .orderBy(desc(routineEntries.date));

  const previous = priorCompletions.find((entry) => {
    const { start: entryDayStart } = getUserDayRange(timezoneOffsetMinutes, new Date(entry.date));
    return entryDayStart.getTime() !== todayStart.getTime();
  });

  let newStreak = 1;
  if (previous) {
    const { start: prevDayStart } = getUserDayRange(timezoneOffsetMinutes, new Date(previous.date));
    const daysDiff = Math.round((todayStart.getTime() - prevDayStart.getTime()) / (1000 * 60 * 60 * 24));
    newStreak = daysDiff === 1 ? routine.currentStreak + 1 : 1;
  }

  await db.update(routines)
    .set({
      totalCompletions: routine.totalCompletions + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(routine.longestStreak, newStreak),
    })
    .where(eq(routines.id, routineId));
}

export async function toggleRoutineTask(
  userId: number,
  routineId: number,
  taskIndex: number,
  timezoneOffsetMinutes: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const routineRows = await db.select().from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .limit(1);
  if (routineRows.length === 0) throw new Error("Rotina não encontrada");
  const totalTasks = routineRows[0].tasks?.length || 0;

  const { start: todayStart, end: todayEnd } = getUserDayRange(timezoneOffsetMinutes);

  const todaysEntries = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      eq(routineEntries.routineId, routineId),
      gte(routineEntries.date, todayStart),
      lte(routineEntries.date, todayEnd)
    ))
    .limit(1);

  const existing = todaysEntries[0];
  const taskKey = String(taskIndex);
  const currentTasks = existing?.completedTasks || [];
  const wasCompleted = existing?.completed || false;

  const newTasks = currentTasks.includes(taskKey)
    ? currentTasks.filter((t) => t !== taskKey)
    : [...currentTasks, taskKey];
  const isNowCompleted = totalTasks > 0 && newTasks.length >= totalTasks;

  if (existing) {
    await db.update(routineEntries)
      .set({ completedTasks: newTasks, completed: isNowCompleted })
      .where(eq(routineEntries.id, existing.id));
  } else {
    await db.insert(routineEntries).values({
      userId,
      routineId,
      date: new Date(),
      completedTasks: newTasks,
      completed: isNowCompleted,
    });
  }

  if (isNowCompleted && !wasCompleted) {
    await recordRoutineCompletion(userId, routineId, timezoneOffsetMinutes);
  }

  return { completedTasks: newTasks, completed: isNowCompleted };
}

/**
 * Grava quanto tempo a rotina levou de fato, na entrada de hoje.
 *
 * A coluna `timeSpent` existe desde o começo e nunca foi escrita: o
 * componente de cronômetro (RoutineTimer) estava pronto e não era usado
 * em tela nenhuma. Sem esse número, `estimatedDuration` não tinha com o
 * que ser comparado — a estimativa nunca era confrontada com a prática.
 *
 * A rotina é conferida por userId antes de qualquer escrita.
 */
export async function recordRoutineTime(
  userId: number,
  routineId: number,
  minutes: number,
  timezoneOffsetMinutes: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const routineRows = await db.select().from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .limit(1);
  if (routineRows.length === 0) return { affectedRows: 0 };

  const { start: todayStart, end: todayEnd } = getUserDayRange(timezoneOffsetMinutes);

  const todaysEntries = await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      eq(routineEntries.routineId, routineId),
      gte(routineEntries.date, todayStart),
      lte(routineEntries.date, todayEnd)
    ))
    .limit(1);

  const existing = todaysEntries[0];

  if (existing) {
    await db.update(routineEntries)
      .set({ timeSpent: minutes })
      .where(eq(routineEntries.id, existing.id));
  } else {
    // Cronometrar sem ter marcado tarefa nenhuma é possível; a entrada
    // nasce aqui, ainda não concluída.
    await db.insert(routineEntries).values({
      userId,
      routineId,
      date: new Date(),
      timeSpent: minutes,
      completed: false,
    });
  }

  return { affectedRows: 1 };
}

/**
 * Tempo real × estimado, por rotina. Só entram rotinas que foram
 * cronometradas pelo menos uma vez.
 */
export async function getRoutineTimeStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(routineEntries)
    .innerJoin(routines, eq(routineEntries.routineId, routines.id))
    .where(and(
      eq(routineEntries.userId, userId),
      isNotNull(routineEntries.timeSpent)
    ));

  const porRotina: Record<number, { title: string; estimated: number | null; soma: number; contagem: number }> = {};

  for (const { routines: routine, routine_entries: entry } of rows) {
    if (entry.timeSpent == null) continue;
    if (!porRotina[routine.id]) {
      porRotina[routine.id] = {
        title: routine.title,
        estimated: routine.estimatedDuration,
        soma: 0,
        contagem: 0,
      };
    }
    porRotina[routine.id].soma += entry.timeSpent;
    porRotina[routine.id].contagem++;
  }

  return Object.entries(porRotina).map(([routineId, d]) => {
    const averageMinutes = Math.round(d.soma / d.contagem);
    return {
      routineId: Number(routineId),
      title: d.title,
      estimatedDuration: d.estimated,
      averageMinutes,
      timedSessions: d.contagem,
      // Positivo = leva mais tempo do que a pessoa estimou.
      difference: d.estimated != null ? averageMinutes - d.estimated : null,
    };
  });
}

export async function getTodayRoutineEntries(userId: number, timezoneOffsetMinutes: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { start: todayStart, end: todayEnd } = getUserDayRange(timezoneOffsetMinutes);

  return await db.select().from(routineEntries)
    .where(and(
      eq(routineEntries.userId, userId),
      gte(routineEntries.date, todayStart),
      lte(routineEntries.date, todayEnd)
    ));
}
