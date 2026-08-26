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

type Caller = ReturnType<typeof appRouter.createCaller>;

async function respirar(
  caller: Caller,
  pattern: string,
  duration: number,
  rating?: number
) {
  await caller.exercises.create({
    exerciseType: "breathing",
    duration,
    pattern,
    completed: true,
    rating,
  });
}

describe("exercises.getAnalytics", () => {
  it("sem nenhuma sessão, devolve zeros e nenhuma média inventada", async () => {
    const caller = appRouter.createCaller(createAuthContext(901));

    const analytics = await caller.exercises.getAnalytics();

    expect(analytics.totalSessions).toBe(0);
    expect(analytics.ratedSessions).toBe(0);
    expect(analytics.averageRating).toBeNull();
    expect(analytics.byPattern).toEqual([]);
  });

  it("separa sessão avaliada de sessão só feita", async () => {
    const caller = appRouter.createCaller(createAuthContext(902));

    await respirar(caller, "4-7-8", 300, 9);
    await respirar(caller, "4-7-8", 240); // sem avaliação

    const analytics = await caller.exercises.getAnalytics();

    expect(analytics.totalSessions).toBe(2);
    expect(analytics.ratedSessions).toBe(1);
    const padrao = analytics.byPattern.find((p) => p.pattern === "4-7-8")!;
    expect(padrao.sessions).toBe(2);
    expect(padrao.ratedSessions).toBe(1);
    // A média usa só o que foi avaliado — a sessão sem nota não vira zero.
    expect(padrao.averageRating).toBe(9);
    expect(padrao.averageDurationSeconds).toBe(270);
  });

  it("ordena os padrões pela avaliação média", async () => {
    const caller = appRouter.createCaller(createAuthContext(903));

    for (const nota of [9, 8, 10]) await respirar(caller, "4-7-8", 300, nota);
    for (const nota of [4, 3, 5]) await respirar(caller, "4-4-4-4", 240, nota);

    const analytics = await caller.exercises.getAnalytics();

    expect(analytics.byPattern[0].pattern).toBe("4-7-8");
    expect(analytics.byPattern[0].averageRating).toBe(9);
    expect(analytics.byPattern[1].averageRating).toBe(4);
  });
});

describe("insight: efetividade da respiração", () => {
  const insightsDoUsuario = async (caller: Caller) =>
    await caller.analytics.insights({ timezoneOffsetMinutes: 0 });

  it("abaixo de 3 avaliações no mesmo padrão, diz o que falta", async () => {
    const caller = appRouter.createCaller(createAuthContext(904));

    await respirar(caller, "5-5", 300, 8);
    await respirar(caller, "5-5", 300, 9);

    const { insights, missing } = await insightsDoUsuario(caller);

    expect(insights.find((i) => i.id === "breathing-effectiveness")).toBeUndefined();
    const falta = missing.find((m) => m.id === "breathing-effectiveness");
    expect(falta?.missing).toMatch(/2 exercícios de respiração e avaliou 2/);
  });

  it("com 3+ avaliações, reporta o padrão mais bem avaliado", async () => {
    const caller = appRouter.createCaller(createAuthContext(905));

    for (const nota of [8, 9, 10]) await respirar(caller, "4-7-8", 360, nota);

    const { insights } = await insightsDoUsuario(caller);
    const insight = insights.find((i) => i.id === "breathing-effectiveness")!;

    expect(insight).toBeDefined();
    expect(insight.sampleSize).toBe(3);
    expect(insight.pattern).toContain("4-7-8");
    expect(insight.pattern).toContain("9/10");
    expect(insight.meaning).toContain("6 minutos");
    expect(insight.action.route).toBe("/breathing");
  });
});
