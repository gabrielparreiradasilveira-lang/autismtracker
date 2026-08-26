import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { normalizarGatilho } from "./triggerMatching";

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

const padroes = { days: 30, timezoneOffsetMinutes: 0 };

describe("normalizarGatilho", () => {
  it("iguala variações de caixa, acento e espaço do mesmo nome", () => {
    expect(normalizarGatilho("  Barulho   Alto ")).toBe("barulho alto");
    expect(normalizarGatilho("BARULHO ALTO")).toBe(normalizarGatilho("barulho alto"));
    expect(normalizarGatilho("Música")).toBe("musica");
  });

  it("mantém nomes diferentes diferentes", () => {
    expect(normalizarGatilho("barulho")).not.toBe(normalizarGatilho("barulho alto"));
  });
});

describe("analytics.patterns — frequência de gatilhos", () => {
  it("conta ocorrências registradas, não gatilhos cadastrados", async () => {
    const caller = appRouter.createCaller(createAuthContext(801));

    // Três gatilhos de som cadastrados e nenhum registrado ainda: a versão
    // anterior mostrava "som: 3" num gráfico chamado de frequência.
    for (const name of ["Liquidificador", "Sirene", "Aspirador"]) {
      await caller.triggers.create({
        name,
        category: "sound",
        severity: 7,
        frequency: "weekly",
      });
    }

    const semRegistro = await caller.analytics.patterns(padroes);
    expect(semRegistro.triggerFrequency).toEqual({});
    expect(semRegistro.triggerOccurrences).toBe(0);
    expect(semRegistro.totalTriggers).toBe(3);

    // Duas ocorrências de um só deles.
    for (let i = 0; i < 2; i++) {
      await caller.mood.create({
        moodLevel: 4,
        anxietyLevel: 7,
        stressLevel: 6,
        energyLevel: 4,
        triggers: ["sirene"],
        timezoneOffsetMinutes: 0,
      });
    }

    const comRegistro = await caller.analytics.patterns(padroes);
    expect(comRegistro.triggerFrequency).toEqual({ sound: 2 });
    expect(comRegistro.triggerOccurrences).toBe(2);
  });

  it("casa o texto digitado com o cadastro apesar de caixa e acento", async () => {
    const caller = appRouter.createCaller(createAuthContext(802));

    await caller.triggers.create({
      name: "Música alta",
      category: "sound",
      severity: 8,
      frequency: "daily",
    });

    await caller.mood.create({
      moodLevel: 3,
      anxietyLevel: 8,
      stressLevel: 7,
      energyLevel: 3,
      triggers: ["  MUSICA ALTA "],
      timezoneOffsetMinutes: 0,
    });

    const resultado = await caller.analytics.patterns(padroes);

    expect(resultado.triggerFrequency).toEqual({ sound: 1 });
    expect(resultado.triggersSemCadastro).toEqual([]);
  });

  it("conta o gatilho ainda não cadastrado e diz quais são", async () => {
    const caller = appRouter.createCaller(createAuthContext(803));

    await caller.symptoms.create({
      symptomType: "sensory_sensitivity",
      severity: 8,
      triggers: ["luz do supermercado"],
    });

    const resultado = await caller.analytics.patterns(padroes);

    expect(resultado.triggerFrequency).toEqual({ other: 1 });
    expect(resultado.triggersSemCadastro).toEqual(["luz do supermercado"]);
  });

  it("devolve média de humor por dia da semana com o tamanho da amostra", async () => {
    const caller = appRouter.createCaller(createAuthContext(804));

    await caller.mood.create({
      moodLevel: 6,
      anxietyLevel: 5,
      stressLevel: 5,
      energyLevel: 5,
      timezoneOffsetMinutes: 0,
    });

    const resultado = await caller.analytics.patterns(padroes);

    expect(resultado.byWeekday).toHaveLength(1);
    expect(resultado.byWeekday[0].averageMood).toBe(6);
    expect(resultado.byWeekday[0].count).toBe(1);
  });

  it("exige autenticação", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.analytics.patterns(padroes)).rejects.toThrow();
  });
});
