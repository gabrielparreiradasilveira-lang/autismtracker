import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-" + userId,
    email: `test${userId}@example.com`,
    name: "Test User",
    loginMethod: "password",
    idade: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

type Caller = ReturnType<typeof appRouter.createCaller>;

const insightById = async (caller: Caller, id: string) => {
  const { insights } = await caller.analytics.insights({ timezoneOffsetMinutes: 0 });
  return insights.find((i) => i.id === id);
};

const missingById = async (caller: Caller, id: string) => {
  const { missing } = await caller.analytics.insights({ timezoneOffsetMinutes: 0 });
  return missing.find((m) => m.id === id);
};

describe("analytics.insights — dados insuficientes", () => {
  it("um usuário sem nenhum registro recebe só o que falta, e nenhum insight", async () => {
    const caller = appRouter.createCaller(createAuthContext(601));

    const { insights, missing } = await caller.analytics.insights({ timezoneOffsetMinutes: 0 });

    expect(insights).toEqual([]);
    expect(missing.length).toBe(6);
    // Nada de conselho genérico: cada item diz o que falta.
    for (const item of missing) {
      expect(item.missing.length).toBeGreaterThan(20);
      expect(item.missing).not.toMatch(/continue registrando seu humor/i);
    }
  });

  it("exige autenticação", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.analytics.insights({ timezoneOffsetMinutes: 0 })).rejects.toThrow();
  });
});

describe("insight: gatilho × severidade do sintoma", () => {
  it("abaixo de 3 ocorrências devolve o que falta, não um insight", async () => {
    const caller = appRouter.createCaller(createAuthContext(602));

    await caller.symptoms.create({ symptomType: "focus", severity: 9, triggers: ["barulho"] });
    await caller.symptoms.create({ symptomType: "focus", severity: 8, triggers: ["barulho"] });

    expect(await insightById(caller, "trigger-symptom")).toBeUndefined();
    expect((await missingById(caller, "trigger-symptom"))?.missing).toMatch(/gatilho/i);
  });

  it("com 3+ ocorrências gera insight com o número certo e rota existente", async () => {
    const caller = appRouter.createCaller(createAuthContext(603));

    for (const severity of [9, 8, 7]) {
      await caller.symptoms.create({ symptomType: "focus", severity, triggers: ["barulho alto"] });
    }
    await caller.symptoms.create({ symptomType: "focus", severity: 2, triggers: ["música calma"] });

    const insight = await insightById(caller, "trigger-symptom");

    expect(insight).toBeDefined();
    expect(insight!.sampleSize).toBe(3);
    // média de 9, 8 e 7
    expect(insight!.pattern).toContain("8.0");
    expect(insight!.pattern).toContain("barulho alto");
    expect(insight!.action.route).toBe("/triggers");
  });
});

describe("insight: efetividade das intervenções por tipo de sintoma", () => {
  it("com 3+ registros no mesmo tipo, reporta a efetividade média", async () => {
    const caller = appRouter.createCaller(createAuthContext(604));

    for (const effectiveness of [8, 9, 10]) {
      await caller.symptoms.create({
        symptomType: "sensory_sensitivity",
        severity: 6,
        interventions: ["fones de ouvido"],
        effectiveness,
      });
    }

    const insight = await insightById(caller, "intervention-symptom");

    expect(insight).toBeDefined();
    expect(insight!.pattern).toContain("Sensibilidade Sensorial");
    expect(insight!.pattern).toContain("9.0"); // média de 8, 9 e 10
    expect(insight!.action.route).toBe("/techniques");
  });
});

describe("insight: técnica mais bem avaliada", () => {
  it("sem avaliação, diz o que falta", async () => {
    const caller = appRouter.createCaller(createAuthContext(605));
    expect(await insightById(caller, "technique-effectiveness")).toBeUndefined();
    expect((await missingById(caller, "technique-effectiveness"))?.missing).toMatch(/efetividade/i);
  });

  it("após avaliar, reporta a técnica com maior nota", async () => {
    const caller = appRouter.createCaller(createAuthContext(606));

    const techniques = await caller.techniques.list();
    await caller.techniques.logUsage({ techniqueId: techniques[0].id, effectiveness: 9 });
    await caller.techniques.logUsage({ techniqueId: techniques[1].id, effectiveness: 4 });

    const insight = await insightById(caller, "technique-effectiveness");

    expect(insight).toBeDefined();
    expect(insight!.pattern).toContain(techniques[0].title);
    expect(insight!.pattern).toContain("9/10");
    expect(insight!.action.route).toBe("/techniques");
  });
});

describe("insight: duração dos episódios", () => {
  it("com 3+ registros do mesmo tipo, reporta a duração média", async () => {
    const caller = appRouter.createCaller(createAuthContext(612));

    for (const duration of [30, 40, 50]) {
      await caller.symptoms.create({ symptomType: "sensory_sensitivity", severity: 6, duration });
    }

    const insight = await insightById(caller, "symptom-duration");

    expect(insight).toBeDefined();
    expect(insight!.pattern).toContain("Sensibilidade Sensorial");
    expect(insight!.pattern).toContain("40 minutos"); // média de 30, 40 e 50
    expect(insight!.action.route).toBe("/symptoms");
  });

  it("sem duração anotada, diz quantos registros faltam", async () => {
    const caller = appRouter.createCaller(createAuthContext(613));
    await caller.symptoms.create({ symptomType: "focus", severity: 5 });

    expect(await insightById(caller, "symptom-duration")).toBeUndefined();
    expect((await missingById(caller, "symptom-duration"))?.missing).toMatch(/dura/i);
  });
});

describe("insight: rotina × humor", () => {
  it("sem dias suficientes, informa quantos faltam em número", async () => {
    const caller = appRouter.createCaller(createAuthContext(607));

    const missing = await missingById(caller, "routine-mood");
    expect(missing).toBeDefined();
    expect(missing!.missing).toMatch(/\d+ dia/);
  });
});

describe("analytics.correlations — amostra mínima", () => {
  it("gatilho com 1 ocorrência não entra no ranking e é contado à parte", async () => {
    const caller = appRouter.createCaller(createAuthContext(608));

    await caller.mood.create({
      moodLevel: 2,
      anxietyLevel: 9,
      stressLevel: 8,
      energyLevel: 3,
      triggers: ["evento raro"],
      timezoneOffsetMinutes: 0,
    });

    const result = await caller.analytics.correlations();

    expect(result.correlations.find((c) => c.trigger === "evento raro")).toBeUndefined();
    expect(result.insufficientSample.triggers).toContain("evento raro");
    expect(result.insufficientSample.minOccurrences).toBe(3);
  });

  it("gatilho com 3 ocorrências entra no ranking", async () => {
    const caller = appRouter.createCaller(createAuthContext(609));

    for (const moodLevel of [3, 4, 2]) {
      await caller.mood.create({
        moodLevel,
        anxietyLevel: 8,
        stressLevel: 7,
        energyLevel: 4,
        triggers: ["multidão"],
      timezoneOffsetMinutes: 0,
      });
    }

    const result = await caller.analytics.correlations();
    const found = result.correlations.find((c) => c.trigger === "multidão");

    expect(found).toBeDefined();
    expect(found!.occurrences).toBe(3);
    expect(result.insufficientSample.triggers).not.toContain("multidão");
  });
});

describe("analytics.predictions — descreve em vez de prever", () => {
  it("com menos de 7 registros informa quantos existem, sem prometer previsão", async () => {
    const caller = appRouter.createCaller(createAuthContext(610));

    await caller.mood.create({ moodLevel: 6, anxietyLevel: 4, stressLevel: 4, energyLevel: 6,
      timezoneOffsetMinutes: 0, });

    const result = await caller.analytics.predictions();

    expect(result.hasEnoughData).toBe(false);
    expect(result.sampleSize).toBe(1);
    expect(result.message).toContain("1 registro");
    expect(result).not.toHaveProperty("confidence");
  });

  it("com 7+ registros devolve as duas janelas e a dispersão, sem campo de confiança", async () => {
    const caller = appRouter.createCaller(createAuthContext(611));

    for (let i = 0; i < 8; i++) {
      await caller.mood.create({ moodLevel: 6, anxietyLevel: 4, stressLevel: 4, energyLevel: 6,
      timezoneOffsetMinutes: 0, });
    }

    const result = await caller.analytics.predictions();

    expect(result.hasEnoughData).toBe(true);
    expect(result.recentAverage?.mood).toBe(6);
    expect(result.historicalAverage?.mood).toBe(6);
    expect(result.sampleSize).toBe(8);
    expect(result.recentSampleSize).toBe(7);
    // Humor constante em 6 => desvio-padrão zero.
    expect(result.variability).toBe(0);
    expect(result).not.toHaveProperty("confidence");
    expect(result).not.toHaveProperty("predictedMood");
  });
});
