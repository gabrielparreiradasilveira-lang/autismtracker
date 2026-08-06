import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("reminders", () => {
  it("should create a reminder successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.create({
      title: "Registrar humor",
      description: "Lembrete para registrar humor diário",
      type: "mood_diary",
      frequency: "daily",
      time: "09:00",
      isSmart: false,
    });

    expect(result).toEqual({ success: true });
  });

  it("should create a smart reminder", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reminders.create({
      title: "Lembrete Inteligente",
      type: "mood_diary",
      frequency: "smart",
      time: "10:00",
      isSmart: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("should list user reminders", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a reminder first
    await caller.reminders.create({
      title: "Test Reminder",
      type: "routine",
      frequency: "daily",
      time: "14:00",
      isSmart: false,
    });

    const reminders = await caller.reminders.list();
    
    expect(Array.isArray(reminders)).toBe(true);
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0]).toHaveProperty("title");
    expect(reminders[0]).toHaveProperty("time");
    expect(reminders[0]).toHaveProperty("isActive");
  });

  it("should get smart reminder suggestions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const suggestions = await caller.reminders.getSmartSuggestions();
    
    expect(suggestions).toHaveProperty("hasSufficientData");
    expect(suggestions).toHaveProperty("message");
    expect(suggestions).toHaveProperty("suggestions");
    expect(Array.isArray(suggestions.suggestions)).toBe(true);
  });

  it("should update reminder status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a reminder
    await caller.reminders.create({
      title: "Update Test",
      type: "exercise",
      frequency: "weekly",
      time: "16:00",
      isSmart: false,
    });

    // Get the reminder
    const reminders = await caller.reminders.list();
    const reminder = reminders.find((r: any) => r.title === "Update Test");
    
    if (reminder) {
      // Update it
      const result = await caller.reminders.update({
        id: reminder.id,
        isActive: false,
      });

      expect(result).toEqual({ success: true });
    }
  });

  it("should delete reminder", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a reminder
    await caller.reminders.create({
      title: "Delete Test",
      type: "selfcare",
      frequency: "daily",
      time: "20:00",
      isSmart: false,
    });

    // Get the reminder
    const reminders = await caller.reminders.list();
    const reminder = reminders.find((r: any) => r.title === "Delete Test");
    
    if (reminder) {
      // Delete it
      const result = await caller.reminders.delete({ id: reminder.id });
      expect(result).toEqual({ success: true });

      // Verify it's no longer active
      const updatedReminders = await caller.reminders.list();
      const deletedReminder = updatedReminders.find((r: any) => r.id === reminder.id);
      expect(deletedReminder).toBeUndefined();
    }
  });

  it("should record reminder response", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a smart reminder
    await caller.reminders.create({
      title: "Response Test",
      type: "mood_diary",
      frequency: "smart",
      time: "11:00",
      isSmart: true,
    });

    // Get the reminder
    const reminders = await caller.reminders.list();
    const reminder = reminders.find((r: any) => r.title === "Response Test");
    
    if (reminder) {
      // Record response
      const result = await caller.reminders.recordResponse({
        id: reminder.id,
        responseTime: new Date(),
      });

      expect(result).toEqual({ success: true });
    }
  });
});
