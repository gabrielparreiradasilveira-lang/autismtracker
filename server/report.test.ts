import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-" + userId,
    email: `test${userId}@example.com`,
    name: "Pessoa de Teste",
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

const params = { days: 90, timezoneOffsetMinutes: 0 };

describe("report.summary", () => {
  it("sem nenhum registro, não inventa média nem padrão", async () => {
    const caller = appRouter.createCaller(createAuthContext(1301));

    const r = await caller.report.summary(params);

    expect(r.counts.mood).toBe(0);
    expect(r.mood.average).toBeNull();
    expect(r.mood.variability).toBeNull();
    expect(r.symptoms.averageSeverityByType).toEqual([]);
    expect(r.insights).toEqual([]);
  });

  it("declara o período analisado e quem gerou", async () => {
    const caller = appRouter.createCaller(createAuthContext(1302));

    const r = await caller.report.summary({ days: 30, timezoneOffsetMinutes: 0 });

    expect(r.period.days).toBe(30);
    expect(r.period.from).toBeInstanceOf(Date);
    expect(r.period.to.getTime()).toBeGreaterThan(r.period.from.getTime());
    expect(r.user.name).toBe("Pessoa de Teste");
  });

  it("traz médias com o tamanho da amostra e a variabilidade", async () => {
    const caller = appRouter.createCaller(createAuthContext(1303));

    for (const moodLevel of [4, 6, 8]) {
      await caller.mood.create({
        moodLevel,
        anxietyLevel: 5,
        stressLevel: 5,
        energyLevel: 5,
        timezoneOffsetMinutes: 0,
      });
    }

    const r = await caller.report.summary(params);

    expect(r.mood.average).toBe(6);
    expect(r.mood.sampleSize).toBe(3);
    // Desvio-padrão de 4, 6 e 8 em torno de 6: sqrt(8/3) ≈ 1.6
    expect(r.mood.variability).toBe(1.6);
  });

  it("reúne sintomas, gatilhos cadastrados e estratégias", async () => {
    const caller = appRouter.createCaller(createAuthContext(1304));

    await caller.triggers.create({
      name: "Sirene",
      category: "sound",
      severity: 9,
      frequency: "rarely",
      copingStrategy: "Sair do ambiente e usar fone",
    });

    for (const severity of [8, 9, 7]) {
      await caller.symptoms.create({
        symptomType: "sensory_sensitivity",
        severity,
        duration: 20,
        triggers: ["sirene"],
      });
    }

    const r = await caller.report.summary(params);

    expect(r.counts.symptoms).toBe(3);
    expect(r.symptoms.averageSeverityByType[0].symptomType).toBe("sensory_sensitivity");
    expect(r.symptoms.averageSeverityByType[0].averageSeverity).toBe(8);
    expect(r.symptoms.topTriggers[0].trigger).toBe("sirene");

    const gatilho = r.registeredTriggers[0];
    expect(gatilho.name).toBe("Sirene");
    expect(gatilho.copingStrategy).toBe("Sair do ambiente e usar fone");
    // Registrar o sintoma com o gatilho marcou a última ocorrência.
    expect(gatilho.lastOccurred).toBeInstanceOf(Date);
  });

  it("inclui os padrões observados, com o tamanho da amostra", async () => {
    const caller = appRouter.createCaller(createAuthContext(1305));

    for (const severity of [9, 8, 7]) {
      await caller.symptoms.create({ symptomType: "focus", severity, triggers: ["barulho alto"] });
    }

    const r = await caller.report.summary(params);
    const insight = r.insights.find((i) => i.id === "trigger-symptom");

    expect(insight).toBeDefined();
    expect(insight!.sampleSize).toBe(3);
  });

  it("não mistura dados de outra pessoa", async () => {
    const alice = appRouter.createCaller(createAuthContext(1306));
    const bob = appRouter.createCaller(createAuthContext(1307));

    await alice.mood.create({
      moodLevel: 9,
      anxietyLevel: 2,
      stressLevel: 2,
      energyLevel: 9,
      timezoneOffsetMinutes: 0,
    });

    const doBob = await bob.report.summary(params);
    expect(doBob.counts.mood).toBe(0);
    expect(doBob.mood.average).toBeNull();
  });

  it("exige autenticação", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.report.summary(params)).rejects.toThrow();
  });
});
