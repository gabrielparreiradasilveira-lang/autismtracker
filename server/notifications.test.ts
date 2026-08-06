import { describe, it, expect, beforeAll } from "vitest";
import * as notifications from "./notifications";

describe("Notifications System", () => {
  const testUserId = 888;
  const testSubscription = {
    endpoint: "https://example.com/push/test123",
    auth: "testAuth123",
    p256dh: "testP256dh123",
  };

  describe("Push Subscriptions", () => {
    it("should subscribe user to push notifications", async () => {
      const result = await notifications.subscribeToPushNotifications(
        testUserId,
        testSubscription
      );
      expect(result?.success).toBe(true);
    });

    it("should update existing subscription", async () => {
      const updatedSubscription = {
        ...testSubscription,
        auth: "updatedAuth",
      };
      const result = await notifications.subscribeToPushNotifications(
        testUserId,
        updatedSubscription
      );
      expect(result?.success).toBe(true);
    });

    it("should get user push subscriptions", async () => {
      const subs = await notifications.getUserPushSubscriptions(testUserId);
      expect(Array.isArray(subs)).toBe(true);
    });

    it("should unsubscribe user from push notifications", async () => {
      const result = await notifications.unsubscribeFromPushNotifications(
        testUserId,
        testSubscription.endpoint
      );
      expect(result?.success).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("should create a notification", async () => {
      const result = await notifications.createNotification({
        userId: testUserId,
        type: "general",
        title: "Test Notification",
        body: "This is a test notification",
        sent: false,
        read: false,
      });
      expect(result).toBeDefined();
    });

    it("should create reminder notification", async () => {
      const result = await notifications.createReminderNotification(
        testUserId,
        1,
        "Reminder Test",
        "This is a reminder",
        new Date()
      );
      expect(result).toBeDefined();
    });

    it("should create challenge notification", async () => {
      const result = await notifications.createChallengeNotification(
        testUserId,
        1,
        "Challenge Test",
        "Complete this challenge"
      );
      expect(result).toBeDefined();
    });

    it("should create badge notification", async () => {
      const result = await notifications.createBadgeNotification(
        testUserId,
        1,
        "Test Badge",
        "🏆"
      );
      expect(result).toBeDefined();
    });

    it("should create achievement notification", async () => {
      const result = await notifications.createAchievementNotification(
        testUserId,
        "Achievement Unlocked",
        "You achieved something great",
        100
      );
      expect(result).toBeDefined();
    });

    it("should get user notifications", async () => {
      const notifs = await notifications.getUserNotifications(testUserId, 10);
      expect(Array.isArray(notifs)).toBe(true);
    });

    it("should get unread notification count", async () => {
      const count = await notifications.getUnreadNotificationCount(testUserId);
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should mark notification as read", async () => {
      const notifs = await notifications.getUserNotifications(testUserId, 1);
      if (Array.isArray(notifs) && notifs.length > 0) {
        const notifId = (notifs[0] as any).id;
        const result = await notifications.markNotificationAsRead(notifId);
        expect(result?.success).toBe(true);
      }
    });

    it("should delete notification", async () => {
      const notifs = await notifications.getUserNotifications(testUserId, 1);
      if (Array.isArray(notifs) && notifs.length > 0) {
        const notifId = (notifs[0] as any).id;
        const result = await notifications.deleteNotification(notifId);
        expect(result?.success).toBe(true);
      }
    });

    it("should get scheduled notifications", async () => {
      const scheduled = await notifications.getScheduledNotifications();
      expect(Array.isArray(scheduled)).toBe(true);
    });
  });
});
