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

async function hasBadge(caller: ReturnType<typeof appRouter.createCaller>, name: string) {
  const badges = await caller.gamification.getBadges();
  return (badges as any[]).some((b) => b.name === name);
}

describe("gamification is wired to real feature actions", () => {
  it("logging the first mood entry awards points and unlocks 'Primeiro Passo'", async () => {
    const ctx = createAuthContext(401);
    const caller = appRouter.createCaller(ctx);

    await caller.mood.create({
      moodLevel: 7,
      anxietyLevel: 3,
      stressLevel: 4,
      energyLevel: 6,
      timezoneOffsetMinutes: 0,
    });

    const stats = await caller.gamification.getStats();
    expect((stats as any).totalPoints).toBeGreaterThanOrEqual(5);
    expect(await hasBadge(caller, "Primeiro Passo")).toBe(true);
  });

  it("completing a routine awards points equal to the routine's point value", async () => {
    const ctx = createAuthContext(402);
    const caller = appRouter.createCaller(ctx);

    await caller.routines.create({
      title: "Rotina com Pontos",
      tasks: ["Única tarefa"],
      timeOfDay: "morning",
    });
    const [routine] = await caller.routines.list();

    await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: 0,
    });

    const stats = await caller.gamification.getStats();
    expect((stats as any).totalPoints).toBeGreaterThanOrEqual(routine.points);
  });

  it("completing 10 distinct routines unlocks 'Mestre da Rotina'", async () => {
    const ctx = createAuthContext(403);
    const caller = appRouter.createCaller(ctx);

    for (let i = 0; i < 10; i++) {
      await caller.routines.create({
        title: `Rotina ${i}`,
        tasks: ["Tarefa"],
        timeOfDay: "morning",
      });
    }
    const routines = await caller.routines.list();

    for (const routine of routines) {
      await caller.routines.entries.toggleTask({
        routineId: routine.id,
        taskIndex: 0,
        timezoneOffsetMinutes: 0,
      });
    }

    expect(await hasBadge(caller, "Mestre da Rotina")).toBe(true);
  });

  it("logging technique usage awards points", async () => {
    const ctx = createAuthContext(404);
    const caller = appRouter.createCaller(ctx);

    const [technique] = await caller.techniques.list();
    const before = await caller.gamification.getStats();

    await caller.techniques.logUsage({ techniqueId: technique.id, effectiveness: 7 });

    const after = await caller.gamification.getStats();
    expect((after as any).totalPoints).toBeGreaterThan((before as any)?.totalPoints ?? 0);
  });

  it("completing 5 breathing exercises unlocks 'Respirador Zen'", async () => {
    const ctx = createAuthContext(405);
    const caller = appRouter.createCaller(ctx);

    for (let i = 0; i < 5; i++) {
      await caller.exercises.create({
        exerciseType: "breathing",
        duration: 120,
        pattern: "4-7-8",
        completed: true,
      });
    }

    expect(await hasBadge(caller, "Respirador Zen")).toBe(true);
  });

  it("a non-breathing exercise does not award gamification points", async () => {
    const ctx = createAuthContext(406);
    const caller = appRouter.createCaller(ctx);

    const before = await caller.gamification.getStats();
    await caller.exercises.create({
      exerciseType: "meditation",
      duration: 300,
      completed: true,
    });
    const after = await caller.gamification.getStats();

    expect((after as any)?.totalPoints ?? 0).toBe((before as any)?.totalPoints ?? 0);
  });

  it("resolving a crisis awards points and unlocks 'Superação'", async () => {
    const ctx = createAuthContext(407);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.crisis.createCrisisEvent({ severity: "medium" });
    const crisisId = (created as any)?.result?.insertId ?? (created as any)?.insertId;
    expect(crisisId).toBeGreaterThan(0);

    await caller.crisis.resolveCrisisEvent({
      crisisId,
      duration: 10,
      techniquesUsed: ["respiração 4-7-8"],
      notes: "Consegui me acalmar",
    });

    const stats = await caller.gamification.getStats();
    expect((stats as any).totalPoints).toBeGreaterThanOrEqual(15);
    expect(await hasBadge(caller, "Superação")).toBe(true);
  });
});
