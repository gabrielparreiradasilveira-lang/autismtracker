import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "password",
    idade: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("routineAnalytics", () => {
  it("should get routine streaks for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getStreaks();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get routine progress with default period", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getProgress({});

    expect(result).toBeDefined();
    expect(result.period).toBe("week");
    expect(result.chartData).toBeDefined();
    expect(Array.isArray(result.chartData)).toBe(true);
    expect(result.totalEntries).toBeGreaterThanOrEqual(0);
    expect(result.completionRate).toBeGreaterThanOrEqual(0);
    expect(result.completionRate).toBeLessThanOrEqual(100);
  });

  it("should get routine progress for specific period", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getProgress({ period: "month" });

    expect(result).toBeDefined();
    expect(result.period).toBe("month");
  });

  it("should get routine correlations with mood", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getCorrelations();

    expect(result).toBeDefined();
    expect(result.hasSufficientData).toBeDefined();
    expect(result.message).toBeDefined();
    expect(Array.isArray(result.correlations)).toBe(true);
  });

  it("should get best routine times", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getBestTimes();

    expect(result).toBeDefined();
    expect(result.bestTimes).toBeDefined();
    expect(Array.isArray(result.bestTimes)).toBe(true);
    expect(result.recommendation).toBeDefined();
  });

  it("should get routine adhesion with default period", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getAdhesion({});

    expect(result).toBeDefined();
    expect(result.period).toBe("month");
    expect(result.adhesionRate).toBeGreaterThanOrEqual(0);
    expect(result.adhesionRate).toBeLessThanOrEqual(100);
    expect(result.totalEntries).toBeGreaterThanOrEqual(0);
    expect(result.completedEntries).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.weeklyBreakdown)).toBe(true);
  });

  it("should get user routine stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.routineAnalytics.getUserStats();

    expect(result).toBeDefined();
    expect(result.totalPoints).toBeGreaterThanOrEqual(0);
    expect(result.totalRoutines).toBeGreaterThanOrEqual(0);
    expect(result.activeRoutines).toBeGreaterThanOrEqual(0);
    expect(result.bestStreak).toBeGreaterThanOrEqual(0);
    expect(result.totalCompletions).toBeGreaterThanOrEqual(0);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });
});
