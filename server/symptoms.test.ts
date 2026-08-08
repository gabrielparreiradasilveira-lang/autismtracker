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

describe("symptoms", () => {
  it("should create a symptom entry and return its id", async () => {
    const ctx = createAuthContext(301);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.symptoms.create({
      symptomType: "focus",
      severity: 7,
      duration: 45,
      triggers: ["barulho alto", "multidão"],
      interventions: ["fones de ouvido"],
      effectiveness: 8,
      notes: "Ocorreu durante o almoço",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("should list symptom entries for the user", async () => {
    const ctx = createAuthContext(302);
    const caller = appRouter.createCaller(ctx);

    await caller.symptoms.create({ symptomType: "communication", severity: 5 });
    await caller.symptoms.create({ symptomType: "focus", severity: 3 });

    const entries = await caller.symptoms.list();

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0]).toHaveProperty("symptomType");
    expect(entries[0]).toHaveProperty("severity");
  });

  it("should filter entries by symptomType", async () => {
    const ctx = createAuthContext(303);
    const caller = appRouter.createCaller(ctx);

    await caller.symptoms.create({ symptomType: "sensory_sensitivity", severity: 8 });
    await caller.symptoms.create({ symptomType: "communication", severity: 4 });

    const filtered = await caller.symptoms.list({ symptomType: "sensory_sensitivity" });

    expect(filtered.length).toBeGreaterThanOrEqual(1);
    for (const entry of filtered) {
      expect(entry.symptomType).toBe("sensory_sensitivity");
    }
  });

  it("should filter entries by period (days)", async () => {
    const ctx = createAuthContext(304);
    const caller = appRouter.createCaller(ctx);

    await caller.symptoms.create({ symptomType: "executive_function", severity: 6 });

    const last7 = await caller.symptoms.list({ days: 7 });
    const last365 = await caller.symptoms.list({ days: 365 });

    expect(last365.length).toBeGreaterThanOrEqual(last7.length);
    expect(last7.length).toBeGreaterThanOrEqual(1);
  });

  it("should delete a symptom entry", async () => {
    const ctx = createAuthContext(305);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.symptoms.create({ symptomType: "repetitive_behavior", severity: 4 });
    const before = await caller.symptoms.list();
    const countBefore = before.length;

    await caller.symptoms.delete({ id: created.id });

    const after = await caller.symptoms.list();
    expect(after.length).toBe(countBefore - 1);
    expect(after.find((e) => e.id === created.id)).toBeUndefined();
  });

  it("should require authentication", async () => {
    const publicCaller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await expect(
      publicCaller.symptoms.list()
    ).rejects.toThrow();

    await expect(
      publicCaller.symptoms.create({ symptomType: "focus", severity: 5 })
    ).rejects.toThrow();
  });

  it("should reject severity outside 1-10 range", async () => {
    const ctx = createAuthContext(306);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.symptoms.create({ symptomType: "focus", severity: 0 })
    ).rejects.toThrow();

    await expect(
      caller.symptoms.create({ symptomType: "focus", severity: 11 })
    ).rejects.toThrow();
  });
});
