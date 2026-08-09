import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getUserDayRange } from "./db";

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

// UTC-3 (Brazil), as returned by Date.prototype.getTimezoneOffset() in that zone.
const BRAZIL_OFFSET_MINUTES = 180;

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

    const result = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });

    expect(result.completedTasks).toEqual(["0"]);
    expect(result.completed).toBe(false);

    const today = await caller.routines.entries.today({ timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES });
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

    await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    const final = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 1,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });

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

    const checked = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(checked.completed).toBe(true);

    const unchecked = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(unchecked.completed).toBe(false);
    expect(unchecked.completedTasks).toEqual([]);

    const today = await caller.routines.entries.today({ timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES });
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
      publicCaller.routines.entries.toggleTask({ routineId: 1, taskIndex: 0, timezoneOffsetMinutes: 0 })
    ).rejects.toThrow();
  });
});

describe("routine day boundaries respect the user's local timezone", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("getUserDayRange computes the boundary from the user's offset, not UTC", () => {
    // 2024-06-01T01:30:00Z is already Saturday in UTC, but still Friday
    // 22:30 in UTC-3 (Brazil). The two timezones must disagree about which
    // day this instant belongs to.
    const instant = new Date("2024-06-01T01:30:00.000Z");

    const utcRange = getUserDayRange(0, instant);
    const brazilRange = getUserDayRange(BRAZIL_OFFSET_MINUTES, instant);

    expect(utcRange.start.toISOString()).toBe("2024-06-01T00:00:00.000Z");
    // Friday local midnight (2024-05-31T00:00 UTC-3) expressed in UTC.
    expect(brazilRange.start.toISOString()).toBe("2024-05-31T03:00:00.000Z");
    expect(utcRange.start.getTime()).not.toBe(brazilRange.start.getTime());
  });

  it("should not leak a completion from the user's local Friday into their local Saturday", async () => {
    const ctx = createAuthContext(204);
    const caller = appRouter.createCaller(ctx);

    await caller.routines.create({
      title: "Rotina de Sexta",
      tasks: ["Tarefa única"],
      timeOfDay: "evening",
    });
    const [routine] = await caller.routines.list();

    // Friday 22:30 local time in Brazil (UTC-3), i.e. already Saturday
    // 01:30 UTC on the server.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T01:30:00.000Z"));

    const completedFriday = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(completedFriday.completed).toBe(true);

    const stillFridayLocally = await caller.routines.entries.today({
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(stillFridayLocally.find((e) => e.routineId === routine.id)?.completed).toBe(true);

    // Move forward to Saturday 01:00 local time in Brazil (04:00 UTC) —
    // a genuinely new local day for the user.
    vi.setSystemTime(new Date("2024-06-01T04:00:00.000Z"));

    const saturdayLocally = await caller.routines.entries.today({
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(saturdayLocally.find((e) => e.routineId === routine.id)).toBeUndefined();

    // Toggling the same task on the new local day must create a fresh
    // entry rather than reusing/overwriting Friday's.
    const saturdayToggle = await caller.routines.entries.toggleTask({
      routineId: routine.id,
      taskIndex: 0,
      timezoneOffsetMinutes: BRAZIL_OFFSET_MINUTES,
    });
    expect(saturdayToggle.completedTasks).toEqual(["0"]);

    const allEntries = await caller.routines.entries.list({ routineId: routine.id });
    expect(allEntries.length).toBe(2);
  });
});
