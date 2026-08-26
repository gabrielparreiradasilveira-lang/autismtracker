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

describe("gatilho digitado × gatilho cadastrado", () => {
  it("registrar o gatilho atualiza a última ocorrência no cadastro", async () => {
    const caller = appRouter.createCaller(createAuthContext(805));

    await caller.triggers.create({
      name: "Sirene",
      category: "sound",
      severity: 9,
      frequency: "rarely",
    });

    const antes = (await caller.triggers.list())[0];
    expect(antes.lastOccurred).toBeNull();

    await caller.mood.create({
      moodLevel: 3,
      anxietyLevel: 9,
      stressLevel: 8,
      energyLevel: 3,
      triggers: ["sirene"],
      timezoneOffsetMinutes: 0,
    });

    const depois = (await caller.triggers.list())[0];
    expect(depois.lastOccurred).toBeInstanceOf(Date);
  });

  it("registrar gatilho não cadastrado não quebra nem cria cadastro", async () => {
    const caller = appRouter.createCaller(createAuthContext(806));

    await caller.symptoms.create({
      symptomType: "focus",
      severity: 6,
      triggers: ["um gatilho qualquer"],
    });

    expect(await caller.triggers.list()).toEqual([]);
  });
});

describe("analytics.correlations", () => {
  it("junta grafias do mesmo gatilho em vez de dividir a amostra", async () => {
    const caller = appRouter.createCaller(createAuthContext(807));

    // Três ocorrências do mesmo gatilho, escritas de três jeitos. Antes
    // viravam três gatilhos de 1 ocorrência e nenhum atingia o mínimo.
    for (const grafia of ["Barulho alto", "barulho alto", "  BARULHO ALTO "]) {
      await caller.mood.create({
        moodLevel: 3,
        anxietyLevel: 8,
        stressLevel: 7,
        energyLevel: 4,
        triggers: [grafia],
        timezoneOffsetMinutes: 0,
      });
    }

    const { correlations } = await caller.analytics.correlations();

    expect(correlations).toHaveLength(1);
    expect(correlations[0].occurrences).toBe(3);
    expect(correlations[0].avgMood).toBe(3);
  });

  it("traz a estratégia de enfrentamento já cadastrada para o gatilho", async () => {
    const caller = appRouter.createCaller(createAuthContext(808));

    await caller.triggers.create({
      name: "Luz fluorescente",
      category: "light",
      severity: 8,
      frequency: "daily",
      copingStrategy: "Usar boné e ficar perto da janela",
    });

    for (let i = 0; i < 3; i++) {
      await caller.mood.create({
        moodLevel: 3,
        anxietyLevel: 8,
        stressLevel: 7,
        energyLevel: 4,
        triggers: ["luz fluorescente"],
        timezoneOffsetMinutes: 0,
      });
    }

    const { correlations } = await caller.analytics.correlations();
    const luz = correlations[0];

    // O rótulo vem do cadastro, não da grafia digitada.
    expect(luz.trigger).toBe("Luz fluorescente");
    expect(luz.registered?.category).toBe("light");
    expect(luz.registered?.copingStrategy).toBe("Usar boné e ficar perto da janela");
  });

  it("gatilho sem cadastro vem com registered nulo", async () => {
    const caller = appRouter.createCaller(createAuthContext(809));

    for (let i = 0; i < 3; i++) {
      await caller.mood.create({
        moodLevel: 5,
        anxietyLevel: 5,
        stressLevel: 5,
        energyLevel: 5,
        triggers: ["algo novo"],
        timezoneOffsetMinutes: 0,
      });
    }

    const { correlations } = await caller.analytics.correlations();
    expect(correlations[0].trigger).toBe("algo novo");
    expect(correlations[0].registered).toBeNull();
  });
});

describe("analytics.correlations — o vazio precisa se explicar", () => {
  it("com gatilhos abaixo do mínimo, devolve quais são, quantas ocorrências e o total", async () => {
    const caller = appRouter.createCaller(createAuthContext(810));

    // Dois gatilhos registrados, nenhum chegando a 3: é o estado em que a
    // tela dizia "nenhum gatilho registrado" e parecia ter perdido tudo.
    for (let i = 0; i < 2; i++) {
      await caller.mood.create({
        moodLevel: 4,
        anxietyLevel: 7,
        stressLevel: 6,
        energyLevel: 4,
        triggers: ["barulho da obra"],
        timezoneOffsetMinutes: 0,
      });
    }
    await caller.mood.create({
      moodLevel: 5,
      anxietyLevel: 6,
      stressLevel: 5,
      energyLevel: 5,
      triggers: ["fila do mercado"],
      timezoneOffsetMinutes: 0,
    });

    const result = await caller.analytics.correlations();

    expect(result.correlations).toEqual([]);
    // Três ocorrências gravadas ao todo — o número que separa "não gravou"
    // de "gravou pouco".
    expect(result.totalTriggersLogged).toBe(3);
    expect(result.insufficientSample.count).toBe(2);
    // Ordenado pelo mais próximo do mínimo.
    expect(result.insufficientSample.triggers).toEqual([
      { trigger: "barulho da obra", occurrences: 2 },
      { trigger: "fila do mercado", occurrences: 1 },
    ]);
  });

  it("quem nunca marcou gatilho tem total zero, e não é o mesmo que ter marcado pouco", async () => {
    const caller = appRouter.createCaller(createAuthContext(811));

    await caller.mood.create({
      moodLevel: 6,
      anxietyLevel: 4,
      stressLevel: 4,
      energyLevel: 6,
      timezoneOffsetMinutes: 0,
    });

    const result = await caller.analytics.correlations();

    expect(result.totalTriggersLogged).toBe(0);
    expect(result.insufficientSample.count).toBe(0);
  });
});
