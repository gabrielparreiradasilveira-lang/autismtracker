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

describe("diary.timeline", () => {
  it("junta anotações das cinco fontes numa lista só", async () => {
    const caller = appRouter.createCaller(createAuthContext(1101));

    await caller.diary.create({ content: "anotação avulsa do dia" });
    await caller.mood.create({
      moodLevel: 4,
      anxietyLevel: 7,
      stressLevel: 6,
      energyLevel: 4,
      notes: "barulho da obra na rua",
      timezoneOffsetMinutes: 0,
    });
    await caller.symptoms.create({
      symptomType: "sensory_sensitivity",
      severity: 8,
      notes: "luz do supermercado incomodou",
    });
    await caller.exercises.create({
      exerciseType: "breathing",
      duration: 300,
      pattern: "4-7-8",
      completed: true,
      rating: 8,
      notes: "ajudou a desacelerar",
    });

    const timeline = await caller.diary.timeline();
    const fontes = timeline.map((i) => i.source).sort();

    expect(fontes).toEqual(["diary", "exercise", "mood", "symptom"]);
    expect(timeline).toHaveLength(4);
  });

  it("ignora registros sem anotação", async () => {
    const caller = appRouter.createCaller(createAuthContext(1102));

    await caller.mood.create({
      moodLevel: 6,
      anxietyLevel: 4,
      stressLevel: 4,
      energyLevel: 6,
      timezoneOffsetMinutes: 0,
    });

    expect(await caller.diary.timeline()).toEqual([]);
  });

  it("leva o contexto e a rota de origem de cada anotação", async () => {
    const caller = appRouter.createCaller(createAuthContext(1103));

    await caller.symptoms.create({
      symptomType: "focus",
      severity: 7,
      notes: "não consegui terminar a tarefa",
    });

    const [item] = await caller.diary.timeline();

    expect(item.source).toBe("symptom");
    expect(item.context).toBe("Foco e Atenção, severidade 7/10");
    expect(item.route).toBe("/symptoms");
  });

  it("busca por texto encontra a anotação em qualquer fonte", async () => {
    const caller = appRouter.createCaller(createAuthContext(1104));

    await caller.diary.create({ content: "hoje o metrô estava cheio" });
    await caller.mood.create({
      moodLevel: 5,
      anxietyLevel: 5,
      stressLevel: 5,
      energyLevel: 5,
      notes: "dia tranquilo",
      timezoneOffsetMinutes: 0,
    });

    const achou = await caller.diary.timeline({ search: "metrô" });
    expect(achou).toHaveLength(1);
    expect(achou[0].content).toContain("metrô");

    expect(await caller.diary.timeline({ search: "aeroporto" })).toEqual([]);
  });

  it("filtra por origem", async () => {
    const caller = appRouter.createCaller(createAuthContext(1105));

    await caller.diary.create({ content: "avulsa" });
    await caller.mood.create({
      moodLevel: 5,
      anxietyLevel: 5,
      stressLevel: 5,
      energyLevel: 5,
      notes: "de humor",
      timezoneOffsetMinutes: 0,
    });

    const soDiario = await caller.diary.timeline({ sources: ["diary"] });
    expect(soDiario).toHaveLength(1);
    expect(soDiario[0].content).toBe("avulsa");
  });

  it("vem em ordem cronológica decrescente", async () => {
    const caller = appRouter.createCaller(createAuthContext(1106));

    await caller.diary.create({ content: "primeira" });
    await new Promise((r) => setTimeout(r, 5));
    await caller.diary.create({ content: "segunda" });

    const timeline = await caller.diary.timeline();
    expect(timeline[0].content).toBe("segunda");
    expect(timeline[1].content).toBe("primeira");
  });

  it("não mostra o diário de outra pessoa", async () => {
    const alice = appRouter.createCaller(createAuthContext(1107));
    const bob = appRouter.createCaller(createAuthContext(1108));

    await alice.diary.create({ content: "coisa da Alice" });

    expect(await bob.diary.timeline()).toEqual([]);
  });
});

describe("diary — edição e remoção", () => {
  it("edita a própria anotação", async () => {
    const caller = appRouter.createCaller(createAuthContext(1109));
    const criada = await caller.diary.create({ content: "texto original" });

    await caller.diary.update({ id: criada.id, content: "texto corrigido" });

    const [item] = await caller.diary.timeline();
    expect(item.content).toBe("texto corrigido");
  });

  it("remove a própria anotação", async () => {
    const caller = appRouter.createCaller(createAuthContext(1110));
    const criada = await caller.diary.create({ content: "para apagar" });

    await caller.diary.delete({ id: criada.id });

    expect(await caller.diary.timeline()).toEqual([]);
  });

  it("outra pessoa não edita nem apaga, e o texto continua intacto", async () => {
    const alice = appRouter.createCaller(createAuthContext(1111));
    const bob = appRouter.createCaller(createAuthContext(1112));

    const daAlice = await alice.diary.create({ content: "anotação privada" });

    await expect(
      bob.diary.update({ id: daAlice.id, content: "invadido" })
    ).rejects.toThrow();
    await expect(bob.diary.delete({ id: daAlice.id })).rejects.toThrow();

    const [item] = await alice.diary.timeline();
    expect(item.content).toBe("anotação privada");
  });

  it("exige autenticação", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.diary.timeline()).rejects.toThrow();
    await expect(publicCaller.diary.create({ content: "x" })).rejects.toThrow();
  });
});
