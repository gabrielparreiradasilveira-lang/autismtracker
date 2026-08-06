import { sql } from 'drizzle-orm';
import { getDb } from './db';

/**
 * Tipos de notificações
 */
export type NotificationType = 
  | 'reminder' 
  | 'challenge' 
  | 'badge' 
  | 'achievement' 
  | 'routine' 
  | 'breathing' 
  | 'crisis' 
  | 'general';

/**
 * Interface para subscription de push
 */
export interface PushSubscription {
  endpoint: string;
  auth: string;
  p256dh: string;
}

/**
 * Interface para notificação
 */
export interface Notification {
  id?: number;
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  sent: boolean;
  read: boolean;
  createdAt?: Date;
}

/**
 * Inscrever usuário em notificações push
 */
export async function subscribeToPushNotifications(
  userId: number,
  subscription: PushSubscription
) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Verificar se já existe subscription
    const existing = await db.execute(
      sql`SELECT id FROM push_subscriptions 
          WHERE userId = ${userId} AND endpoint = ${subscription.endpoint}`
    );

    if (existing && Array.isArray(existing) && (existing as any).length > 0) {
      // Atualizar subscription existente
      await db.execute(
        sql`UPDATE push_subscriptions 
            SET auth = ${subscription.auth}, 
                p256dh = ${subscription.p256dh},
                updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
            WHERE userId = ${userId} AND endpoint = ${subscription.endpoint}`
      );
    } else {
      // Criar nova subscription
      await db.execute(
        sql`INSERT INTO push_subscriptions 
            (userId, endpoint, auth, p256dh, isActive) 
            VALUES (${userId}, ${subscription.endpoint}, ${subscription.auth}, ${subscription.p256dh}, true)`
      );
    }

    console.log('[Notifications] User subscribed to push notifications:', userId);
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error subscribing to push:', error);
    return null;
  }
}

/**
 * Desinscrever usuário de notificações push
 */
export async function unsubscribeFromPushNotifications(
  userId: number,
  endpoint: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`UPDATE push_subscriptions 
          SET isActive = false, updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE userId = ${userId} AND endpoint = ${endpoint}`
    );

    console.log('[Notifications] User unsubscribed from push notifications:', userId);
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error unsubscribing from push:', error);
    return null;
  }
}

/**
 * Obter subscriptions ativas de um usuário
 */
export async function getUserPushSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const subscriptions = await db.execute(
      sql`SELECT endpoint, auth, p256dh FROM push_subscriptions 
          WHERE userId = ${userId} AND isActive = true`
    );

    return Array.isArray(subscriptions) ? subscriptions : [];
  } catch (error) {
    console.error('[Notifications] Error getting user subscriptions:', error);
    return [];
  }
}

/**
 * Criar notificação
 */
export async function createNotification(
  notification: Notification
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const scheduledFor = notification.scheduledFor || new Date();
    const dataJson = notification.data ? JSON.stringify(notification.data) : null;

    const result = await db.execute(
      sql`INSERT INTO notifications 
          (userId, type, title, body, icon, data, scheduledFor, sent, read) 
          VALUES (
            ${notification.userId},
            ${notification.type},
            ${notification.title},
            ${notification.body},
            ${notification.icon || null},
            ${dataJson},
            ${scheduledFor},
            false,
            false
          )`
    );

    console.log('[Notifications] Notification created:', notification.userId);
    return { success: true, result };
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error);
    return null;
  }
}

/**
 * Obter notificações não lidas de um usuário
 */
export async function getUserNotifications(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const notifications = await db.execute(
      sql`SELECT id, type, title, body, icon, data, scheduledFor, sent, read, createdAt 
          FROM notifications 
          WHERE userId = ${userId}
          ORDER BY createdAt DESC
          LIMIT ${limit}`
    );

    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    console.error('[Notifications] Error getting user notifications:', error);
    return [];
  }
}

/**
 * Marcar notificação como lida
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`UPDATE notifications 
          SET read = true 
          WHERE id = ${notificationId}`
    );

    console.log('[Notifications] Notification marked as read:', notificationId);
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error marking notification as read:', error);
    return null;
  }
}

/**
 * Obter notificações agendadas para envio
 */
export async function getScheduledNotifications() {
  const db = await getDb();
  if (!db) return [];

  try {
    const notifications = await db.execute(
      sql`SELECT id, userId, type, title, body, icon, data, scheduledFor 
          FROM notifications 
          WHERE sent = false 
          AND scheduledFor <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
          ORDER BY scheduledFor ASC
          LIMIT 100`
    );

    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Marcar notificação como enviada
 */
export async function markNotificationAsSent(notificationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`UPDATE notifications 
          SET sent = true, sentAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE id = ${notificationId}`
    );

    console.log('[Notifications] Notification marked as sent:', notificationId);
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error marking notification as sent:', error);
    return null;
  }
}

/**
 * Deletar notificação
 */
export async function deleteNotification(notificationId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`DELETE FROM notifications WHERE id = ${notificationId}`
    );

    console.log('[Notifications] Notification deleted:', notificationId);
    return { success: true };
  } catch (error) {
    console.error('[Notifications] Error deleting notification:', error);
    return null;
  }
}

/**
 * Obter contagem de notificações não lidas
 */
export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM notifications 
          WHERE userId = ${userId} AND read = false`
    );

    if (Array.isArray(result) && result.length > 0) {
      return (result[0] as any).count || 0;
    }
    return 0;
  } catch (error) {
    console.error('[Notifications] Error getting unread count:', error);
    return 0;
  }
}

/**
 * Criar notificação de lembrete
 */
export async function createReminderNotification(
  userId: number,
  reminderId: number,
  title: string,
  body: string,
  scheduledFor: Date
) {
  return createNotification({
    userId,
    type: 'reminder',
    title,
    body,
    icon: '🔔',
    data: { reminderId },
    scheduledFor,
    sent: false,
    read: false,
  });
}

/**
 * Criar notificação de desafio
 */
export async function createChallengeNotification(
  userId: number,
  challengeId: number,
  title: string,
  body: string
) {
  return createNotification({
    userId,
    type: 'challenge',
    title,
    body,
    icon: '🎯',
    data: { challengeId },
    sent: false,
    read: false,
  });
}

/**
 * Criar notificação de badge
 */
export async function createBadgeNotification(
  userId: number,
  badgeId: number,
  badgeName: string,
  badgeIcon: string
) {
  return createNotification({
    userId,
    type: 'badge',
    title: 'Nova Badge Desbloqueada!',
    body: `Você desbloqueou a badge "${badgeName}"`,
    icon: badgeIcon,
    data: { badgeId },
    sent: false,
    read: false,
  });
}

/**
 * Criar notificação de conquista
 */
export async function createAchievementNotification(
  userId: number,
  title: string,
  body: string,
  points: number
) {
  return createNotification({
    userId,
    type: 'achievement',
    title,
    body,
    icon: '🏆',
    data: { points },
    sent: false,
    read: false,
  });
}

/**
 * Criar notificação de crise para contatos de emergência
 */
export async function createCrisisNotification(
  userId: number,
  crisisId: number,
  severity: string,
  contactName: string
) {
  const severityLabels = {
    low: 'desconfortável',
    medium: 'ansioso',
    high: 'muito mal',
    critical: 'crise severa',
  };

  return createNotification({
    userId,
    type: 'crisis',
    title: 'Alerta de Crise',
    body: `${contactName} está em ${severityLabels[severity as keyof typeof severityLabels] || 'crise'} e pode precisar de suporte`,
    icon: '🚨',
    data: { crisisId, severity },
    sent: false,
    read: false,
  });
}
