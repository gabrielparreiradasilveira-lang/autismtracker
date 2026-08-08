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

describe("routine task completion (checkbox)", () => {
  it("should create today's entry on first task toggle and mark task as completed", async () => {
    const ctx = createAuthContext(201);
    const caller = appRouter.createCaller(ctx);

    await caller.routines.create({
      title: "Rotina Matinal",
      tasks: ["Escovar os dentes", "Tomar café"],
      timeOfDay: "morning",
    });
    const [routine] = await caller.routines.list();

    const result = await caller.routines.entries.toggleTask({ routineId: routine.id, taskIndex: 0 });

    expect(result.completedTasks).toEqual(["0"]);
    expect(result.completed).toBe(false);

    const today = await caller.routines.entries.today();
    const entry = today.find((e) => e.routineId === routine.id);
    expect(entry?.completedTasks).toEqual(["0"]);
  });

  it("should mark the routine as completed once every task is checked, and bump streak/points", async () => {
    const ctx = createAuthContext(202);
    const caller = appRouter.createCaller(ctx);

    await caller.routines.create({
      title: "Rotina Noturna",
      tasks: ["Escovar os dentes", "Ler um livro"],
      timeOfDay: "night",
    });
    const [routine] = await caller.routines.list();

    await caller.routines.entries.toggleTask({ routineId: routine.id, taskIndex: 0 });
    const final = await caller.routines.entries.toggleTask({ routineId: routine.id, taskIndex: 1 });

    expect(final.completed).toBe(true);
    expect(final.completedTasks.sort()).toEqual(["0", "1"]);

    const [updatedRoutine] = await caller.routines.list();
    expect(updatedRoutine.totalCompletions).toBe(1);
    expect(updatedRoutine.currentStreak).toBe(1);
    expect(updatedRoutine.longestStreak).toBe(1);
  });

  it("should uncheck a task without duplicating entries or double-counting completion", async () => {
    const ctx = createAuthContext(203);
    const caller = appRouter.createCaller(ctx);

    await caller.routines.create({
      title: "Rotina Única",
      tasks: ["Tarefa A"],
      timeOfDay: "afternoon",
    });
    const [routine] = await caller.routines.list();

    const checked = await caller.routines.entries.toggleTask({ routineId: routine.id, taskIndex: 0 });
    expect(checked.completed).toBe(true);

    const unchecked = await caller.routines.entries.toggleTask({ routineId: routine.id, taskIndex: 0 });
    expect(unchecked.completed).toBe(false);
    expect(unchecked.completedTasks).toEqual([]);

    const today = await caller.routines.entries.today();
    const entriesForRoutine = today.filter((e) => e.routineId === routine.id);
    expect(entriesForRoutine.length).toBe(1);

    const [updatedRoutine] = await caller.routines.list();
    expect(updatedRoutine.totalCompletions).toBe(1);
  });

  it("should require authentication", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(
      publicCaller.routines.entries.toggleTask({ routineId: 1, taskIndex: 0 })
    ).rejects.toThrow();
  });
});
