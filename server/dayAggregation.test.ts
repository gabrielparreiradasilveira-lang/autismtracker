import { describe, expect, it } from "vitest";
import * as db from "./db";

/** As datas são construídas com setHours (relógio local), então o
 *  agrupamento tem que usar o mesmo fuso para o teste não depender da
 *  máquina em que roda. */
const FUSO = new Date().getTimezoneOffset();

/**
 * Estes testes reproduzem dois vieses que existiam no agrupamento por dia
 * das correlações:
 *
 * 1. o humor do dia era o ÚLTIMO registro lido, não a média dos registros;
 * 2. na correlação rotina × humor, um dia em que a pessoa registrou humor
 *    e não tocou em rotina nenhuma desaparecia da análise — e esse é
 *    exatamente um dia "sem rotina", ou seja, o grupo de comparação.
 *
 * Cada teste usa um userId próprio: o banco de teste é compartilhado
 * entre os arquivos.
 */

/** Data a N dias atrás, em hora cheia, longe da fronteira do dia. */
function diasAtras(n: number, hora = 12) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hora, 0, 0, 0);
  return d;
}

async function registrarHumor(userId: number, date: Date, moodLevel: number, anxietyLevel = 5) {
  await db.createMoodEntry({
    userId,
    date,
    moodLevel,
    anxietyLevel,
    stressLevel: 5,
    energyLevel: 5,
    triggers: null,
  });
}

async function concluirRotina(userId: number, date: Date) {
  await db.createRoutineEntry({ userId, routineId: 1, date, completed: true });
}

describe("correlação rotina × humor", () => {
  it("dois registros de humor no mesmo dia viram a média, não o último", async () => {
    const userId = 701;

    // Cinco dias com rotina concluída e humor 8, para passar do mínimo.
    for (let i = 1; i <= 5; i++) {
      await concluirRotina(userId, diasAtras(i));
      await registrarHumor(userId, diasAtras(i), 8);
    }

    // Um segundo registro no primeiro dia, bem mais baixo: a média do dia
    // passa a ser (8+2)/2 = 5, e a média dos cinco dias, (5+8*4)/5 = 7.4.
    await registrarHumor(userId, diasAtras(1, 20), 2);

    const resultado = await db.getRoutineMoodCorrelations(userId, FUSO);

    expect(resultado.hasSufficientData).toBe(true);
    expect(resultado.daysWithRoutines).toBe(5);
    expect(resultado.avgMoodWithRoutines).toBe(7.4);
  });

  it("dia com humor registrado e nenhuma linha de rotina conta como dia sem rotina", async () => {
    const userId = 702;

    // 3 dias com rotina concluída e humor alto.
    for (let i = 1; i <= 3; i++) {
      await concluirRotina(userId, diasAtras(i));
      await registrarHumor(userId, diasAtras(i), 9);
    }

    // 3 dias com humor baixo e NENHUMA linha de rotina. Antes estes dias
    // sumiam e a análise ficava sem grupo de comparação.
    for (let i = 4; i <= 6; i++) {
      await registrarHumor(userId, diasAtras(i), 3);
    }

    const resultado = await db.getRoutineMoodCorrelations(userId, FUSO);

    expect(resultado.hasSufficientData).toBe(true);
    expect(resultado.daysWithRoutines).toBe(3);
    expect(resultado.daysWithoutRoutines).toBe(3);
    expect(resultado.avgMoodWithRoutines).toBe(9);
    expect(resultado.avgMoodWithoutRoutines).toBe(3);
    expect(resultado.correlations[0].impact).toBe("Positivo");
  });
});

describe("correlação sintoma × humor", () => {
  it("usa a média dos registros de humor do dia, não o último", async () => {
    const userId = 703;

    // 3 dias com sintoma severo e dois registros de humor cada (2 e 6).
    for (let i = 1; i <= 3; i++) {
      await db.createSymptomEntry({
        userId,
        date: diasAtras(i),
        symptomType: "focus",
        severity: 9,
      });
      await registrarHumor(userId, diasAtras(i, 9), 2);
      await registrarHumor(userId, diasAtras(i, 21), 6);
    }

    const resultado = await db.getSymptomMoodCorrelation(userId, FUSO, 30);

    expect(resultado.hasSufficientData).toBe(true);
    expect(resultado.highSeverityDayCount).toBe(3);
    expect(resultado.avgMoodHighSeverity).toBe(4);
  });
});

describe("fronteira de dia no fuso do usuário", () => {
  it("registro das 22h30 no Brasil conta no próprio dia, não no seguinte", () => {
    // 01h30 UTC = 22h30 do dia anterior em UTC-3 (offset 180).
    const instante = new Date("2026-03-10T01:30:00.000Z");

    expect(db.getUserDayKey(0, instante)).toBe("2026-03-10");
    expect(db.getUserDayKey(180, instante)).toBe("2026-03-09");
    // 09/03/2026 é segunda-feira; em UTC o registro cairia na terça.
    expect(db.toUserWallClock(180, instante).getUTCDay()).toBe(1);
    expect(db.toUserWallClock(0, instante).getUTCDay()).toBe(2);
  });

  it("getSymptomAnalytics agrupa pelo dia do usuário, não pelo dia UTC", async () => {
    const userId = 704;

    // Ontem, 01h30 UTC — ou seja, anteontem às 22h30 para quem está em UTC-3.
    const instante = new Date();
    instante.setUTCDate(instante.getUTCDate() - 1);
    instante.setUTCHours(1, 30, 0, 0);

    await db.createSymptomEntry({
      userId,
      date: instante,
      symptomType: "sensory_sensitivity",
      severity: 6,
    });

    const noFusoDoBrasil = await db.getSymptomAnalytics(userId, 180, 30);
    const emUtc = await db.getSymptomAnalytics(userId, 0, 30);

    const diaLocal = db.getUserDayKey(180, instante);
    const diaUtc = db.getUserDayKey(0, instante);

    expect(diaLocal).not.toBe(diaUtc);
    expect(noFusoDoBrasil.severityTrend.map((d) => d.date)).toEqual([diaLocal]);
    expect(emUtc.severityTrend.map((d) => d.date)).toEqual([diaUtc]);
    expect(noFusoDoBrasil.severityByWeekday[0].weekday).toBe(
      db.toUserWallClock(180, instante).getUTCDay()
    );
  });
});
