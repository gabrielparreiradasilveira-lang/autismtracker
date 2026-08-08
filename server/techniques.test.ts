import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
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

  return ctx;
}

describe("techniques", () => {
  it("should list seeded techniques with favorite/effectiveness defaults", async () => {
    const ctx = createAuthContext(101);
    const caller = appRouter.createCaller(ctx);

    const techniques = await caller.techniques.list();

    expect(Array.isArray(techniques)).toBe(true);
    expect(techniques.length).toBeGreaterThan(0);
    expect(techniques[0]).toHaveProperty("title");
    expect(techniques[0]).toHaveProperty("category");
    expect(techniques[0]).toHaveProperty("isFavorite", false);
    expect(techniques[0]).toHaveProperty("usageCount", 0);
  });

  it("should filter techniques by category", async () => {
    const ctx = createAuthContext(102);
    const caller = appRouter.createCaller(ctx);

    const techniques = await caller.techniques.list({ category: "breathing" });

    expect(techniques.length).toBeGreaterThan(0);
    for (const technique of techniques) {
      expect(technique.category).toBe("breathing");
    }
  });

  it("should filter techniques by difficulty", async () => {
    const ctx = createAuthContext(103);
    const caller = appRouter.createCaller(ctx);

    const techniques = await caller.techniques.list({ difficulty: "beginner" });

    expect(techniques.length).toBeGreaterThan(0);
    for (const technique of techniques) {
      expect(technique.difficulty).toBe("beginner");
    }
  });

  it("should toggle a technique as favorite and back", async () => {
    const ctx = createAuthContext(104);
    const caller = appRouter.createCaller(ctx);

    const [firstTechnique] = await caller.techniques.list();

    const favorited = await caller.techniques.toggleFavorite({ techniqueId: firstTechnique.id });
    expect(favorited).toEqual({ isFavorite: true });

    const listed = await caller.techniques.list();
    const found = listed.find((t) => t.id === firstTechnique.id);
    expect(found?.isFavorite).toBe(true);

    const unfavorited = await caller.techniques.toggleFavorite({ techniqueId: firstTechnique.id });
    expect(unfavorited).toEqual({ isFavorite: false });
  });

  it("should return favorited techniques in getFavorites", async () => {
    const ctx = createAuthContext(105);
    const caller = appRouter.createCaller(ctx);

    const [technique] = await caller.techniques.list();
    await caller.techniques.toggleFavorite({ techniqueId: technique.id });

    const favorites = await caller.techniques.getFavorites();
    expect(favorites.some((f: any) => f.id === technique.id)).toBe(true);
  });

  it("should log usage with effectiveness and notes, incrementing usage count", async () => {
    const ctx = createAuthContext(106);
    const caller = appRouter.createCaller(ctx);

    const [technique] = await caller.techniques.list();

    const first = await caller.techniques.logUsage({
      techniqueId: technique.id,
      effectiveness: 8,
      notes: "Funcionou bem durante o intervalo",
    });
    expect(first).toEqual({ usageCount: 1 });

    const second = await caller.techniques.logUsage({
      techniqueId: technique.id,
      effectiveness: 9,
    });
    expect(second).toEqual({ usageCount: 2 });

    const listed = await caller.techniques.list();
    const found = listed.find((t) => t.id === technique.id);
    expect(found?.usageCount).toBe(2);
    expect(found?.effectiveness).toBe(9);
  });

  it("should reject effectiveness outside the 1-10 range", async () => {
    const ctx = createAuthContext(107);
    const caller = appRouter.createCaller(ctx);

    const [technique] = await caller.techniques.list();

    await expect(
      caller.techniques.logUsage({ techniqueId: technique.id, effectiveness: 11 })
    ).rejects.toThrow();
  });

  it("should require authentication for mutations", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(publicCaller.techniques.list()).rejects.toThrow();
  });
});
