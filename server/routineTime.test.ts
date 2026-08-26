import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

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

async function criarRotina(caller: Caller, title: string, estimatedDuration?: number) {
  await caller.routines.create({
    title,
    timeOfDay: "morning",
    tasks: ["tarefa"],
    estimatedDuration,
  });
  const rotinas = await caller.routines.list();
  return rotinas.find((r) => r.title === title)!;
}

describe("tempo cronometrado da rotina", () => {
  it("guarda a estimativa informada na criação", async () => {
    const caller = appRouter.createCaller(createAuthContext(1001));
    const rotina = await criarRotina(caller, "Rotina com estimativa", 20);

    expect(rotina.estimatedDuration).toBe(20);
  });

  it("registra o tempo e devolve a média com a diferença para a estimativa", async () => {
    const caller = appRouter.createCaller(createAuthContext(1002));
    const rotina = await criarRotina(caller, "Rotina cronometrada", 15);

    await caller.routines.entries.recordTime({
      routineId: rotina.id,
      minutes: 25,
      timezoneOffsetMinutes: 0,
    });

    const stats = await caller.routineAnalytics.getTimeStats();
    const desta = stats.find((s) => s.routineId === rotina.id)!;

    expect(desta.averageMinutes).toBe(25);
    expect(desta.timedSessions).toBe(1);
    expect(desta.estimatedDuration).toBe(15);
    // Leva 10 minutos a mais do que a pessoa esperava.
    expect(desta.difference).toBe(10);
  });

  it("regravar no mesmo dia substitui o tempo, em vez de somar uma sessão", async () => {
    const caller = appRouter.createCaller(createAuthContext(1003));
    const rotina = await criarRotina(caller, "Rotina regravada", 10);

    await caller.routines.entries.recordTime({
      routineId: rotina.id,
      minutes: 5,
      timezoneOffsetMinutes: 0,
    });
    await caller.routines.entries.recordTime({
      routineId: rotina.id,
      minutes: 12,
      timezoneOffsetMinutes: 0,
    });

    const stats = await caller.routineAnalytics.getTimeStats();
    const desta = stats.find((s) => s.routineId === rotina.id)!;

    expect(desta.timedSessions).toBe(1);
    expect(desta.averageMinutes).toBe(12);
  });

  it("sem estimativa, a diferença é nula em vez de zero", async () => {
    const caller = appRouter.createCaller(createAuthContext(1004));
    const rotina = await criarRotina(caller, "Rotina sem estimativa");

    await caller.routines.entries.recordTime({
      routineId: rotina.id,
      minutes: 30,
      timezoneOffsetMinutes: 0,
    });

    const stats = await caller.routineAnalytics.getTimeStats();
    const desta = stats.find((s) => s.routineId === rotina.id)!;

    expect(desta.estimatedDuration).toBeNull();
    expect(desta.difference).toBeNull();
  });

  it("rotina de outra pessoa é recusada e nada é gravado", async () => {
    const alice = appRouter.createCaller(createAuthContext(1005));
    const bob = appRouter.createCaller(createAuthContext(1006));

    const rotinaDaAlice = await criarRotina(alice, "Rotina da Alice", 10);

    await expect(
      bob.routines.entries.recordTime({
        routineId: rotinaDaAlice.id,
        minutes: 99,
        timezoneOffsetMinutes: 0,
      })
    ).rejects.toThrow();

    expect(await bob.routineAnalytics.getTimeStats()).toEqual([]);
    expect(await alice.routineAnalytics.getTimeStats()).toEqual([]);
  });

  it("só entram rotinas cronometradas alguma vez", async () => {
    const caller = appRouter.createCaller(createAuthContext(1007));
    await criarRotina(caller, "Nunca cronometrada", 10);

    expect(await caller.routineAnalytics.getTimeStats()).toEqual([]);
  });
});

describe("recordRoutineTime", () => {
  it("cria a entrada do dia quando ainda não existe, sem marcar como concluída", async () => {
    const userId = 1008;
    const caller = appRouter.createCaller(createAuthContext(userId));
    const rotina = await criarRotina(caller, "Rotina sem tarefa marcada", 10);

    await db.recordRoutineTime(userId, rotina.id, 8, 0);

    const entradas = await db.getRoutineEntriesByUser(userId, rotina.id);
    expect(entradas).toHaveLength(1);
    expect(entradas[0].timeSpent).toBe(8);
    expect(entradas[0].completed).toBe(false);
  });
});
