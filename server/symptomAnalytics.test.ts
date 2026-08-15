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

describe("symptoms.getAnalytics", () => {
  it("returns zeroed analytics when there are no entries", async () => {
    const ctx = createAuthContext(501);
    const caller = appRouter.createCaller(ctx);

    const analytics = await caller.symptoms.getAnalytics();

    expect(analytics.totalEntries).toBe(0);
    expect(analytics.averageSeverityByType).toEqual([]);
    expect(analytics.severityTrend).toEqual([]);
    expect(analytics.averageEffectiveness).toBeNull();
    expect(analytics.topTriggers).toEqual([]);
  });

  it("computes average severity by type, effectiveness, and top triggers", async () => {
    const ctx = createAuthContext(502);
    const caller = appRouter.createCaller(ctx);

    await caller.symptoms.create({
      symptomType: "focus",
      severity: 8,
      interventions: ["fones de ouvido"],
      effectiveness: 6,
      triggers: ["barulho"],
    });
    await caller.symptoms.create({
      symptomType: "focus",
      severity: 4,
      interventions: ["pausa"],
      effectiveness: 8,
      triggers: ["barulho", "multidão"],
    });
    await caller.symptoms.create({
      symptomType: "communication",
      severity: 6,
    });

    const analytics = await caller.symptoms.getAnalytics();

    expect(analytics.totalEntries).toBe(3);

    const focus = analytics.averageSeverityByType.find((t) => t.symptomType === "focus");
    expect(focus?.count).toBe(2);
    expect(focus?.averageSeverity).toBe(6);

    expect(analytics.interventionsLoggedCount).toBe(2);
    expect(analytics.averageEffectiveness).toBe(7);

    const barulho = analytics.topTriggers.find((t) => t.trigger === "barulho");
    expect(barulho?.count).toBe(2);
  });

  it("requires authentication", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.symptoms.getAnalytics()).rejects.toThrow();
  });
});

describe("symptoms.getMoodCorrelation", () => {
  it("reports insufficient data with fewer than 3 overlapping days", async () => {
    const ctx = createAuthContext(503);
    const caller = appRouter.createCaller(ctx);

    await caller.symptoms.create({ symptomType: "focus", severity: 9 });

    const correlation = await caller.symptoms.getMoodCorrelation();
    expect(correlation.hasSufficientData).toBe(false);
  });

  it("requires authentication", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.symptoms.getMoodCorrelation()).rejects.toThrow();
  });
});

describe("techniques.getAnalytics", () => {
  it("returns zeroed analytics when no technique has been used", async () => {
    const ctx = createAuthContext(504);
    const caller = appRouter.createCaller(ctx);

    const analytics = await caller.techniques.getAnalytics();

    expect(analytics.totalTechniquesUsed).toBe(0);
    expect(analytics.mostUsed).toEqual([]);
    expect(analytics.mostEffective).toEqual([]);
    expect(analytics.averageEffectiveness).toBeNull();
  });

  it("ranks techniques by usage and effectiveness after logging usage", async () => {
    const ctx = createAuthContext(505);
    const caller = appRouter.createCaller(ctx);

    const allTechniques = await caller.techniques.list();
    const [first, second] = allTechniques;

    await caller.techniques.logUsage({ techniqueId: first.id, effectiveness: 9 });
    await caller.techniques.logUsage({ techniqueId: first.id, effectiveness: 9 });
    await caller.techniques.logUsage({ techniqueId: second.id, effectiveness: 4 });

    const analytics = await caller.techniques.getAnalytics();

    expect(analytics.totalTechniquesUsed).toBe(2);
    expect(analytics.mostUsed[0].id).toBe(first.id);
    expect(analytics.mostUsed[0].usageCount).toBe(2);
    expect(analytics.mostEffective[0].id).toBe(first.id);
    expect(analytics.mostEffective[0].effectiveness).toBe(9);
  });

  it("requires authentication", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.techniques.getAnalytics()).rejects.toThrow();
  });
});
