import { sql } from 'drizzle-orm';
import { getDb } from './db';

/**
 * Tipos de severidade de crise
 */
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Categorias de técnicas de crise
 */
export type TechniqueCategory = 'breathing' | 'grounding' | 'sensory' | 'movement' | 'cognitive';

/**
 * Criar evento de crise
 */
export async function createCrisisEvent(
  userId: number,
  severity: CrisisSeverity,
  triggers?: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`INSERT INTO crisis_events (userId, severity, triggers, resolved) 
          VALUES (${userId}, ${severity}, ${triggers || null}, false)`
    );

    console.log('[Crisis] Crisis event created:', userId);
    return { success: true, result };
  } catch (error) {
    console.error('[Crisis] Error creating crisis event:', error);
    return null;
  }
}

/**
 * Resolver evento de crise
 */
export async function resolveCrisisEvent(
  userId: number,
  crisisId: number,
  duration: number,
  techniquesUsed: string[],
  notes?: string
) {
  const db = await getDb();
  if (!db) return null;

  const techniquesJson = JSON.stringify(techniquesUsed);

  // O filtro por userId é o que impede resolver a crise de outra pessoa.
  const result = await db.execute(
    sql`UPDATE crisis_events
        SET resolved = true,
            resolvedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
            duration = ${duration},
            techniquesUsed = ${techniquesJson},
            notes = ${notes || null}
        WHERE id = ${crisisId} AND userId = ${userId}`
  );

  return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
}

/**
 * Obter eventos de crise do usuário
 */
export async function getUserCrisisEvents(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  try {
    const events = await db.execute(
      sql`SELECT id, severity, triggers, techniquesUsed, duration, notes, resolved, startedAt, resolvedAt, createdAt
          FROM crisis_events 
          WHERE userId = ${userId}
          ORDER BY startedAt DESC
          LIMIT ${limit}`
    );

    return Array.isArray(events) ? events : [];
  } catch (error) {
    console.error('[Crisis] Error getting user crisis events:', error);
    return [];
  }
}

/**
 * Obter estatísticas de crises do usuário
 */
export async function getUserCrisisStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const stats = await db.execute(
      sql`SELECT 
            COUNT(*) as totalCrises,
            SUM(CASE WHEN resolved = true THEN 1 ELSE 0 END) as resolvedCrises,
            AVG(duration) as avgDuration,
            MAX(startedAt) as lastCrisis
          FROM crisis_events 
          WHERE userId = ${userId}`
    );

    if (Array.isArray(stats) && stats.length > 0) {
      return stats[0];
    }
    return null;
  } catch (error) {
    console.error('[Crisis] Error getting user crisis stats:', error);
    return null;
  }
}

/**
 * Criar contato de emergência
 */
export async function createEmergencyContact(
  userId: number,
  name: string,
  relationship: string,
  phone?: string,
  email?: string,
  isPrimary = false,
  notes?: string
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`INSERT INTO emergency_contacts (userId, name, relationship, phone, email, isPrimary, notes) 
          VALUES (${userId}, ${name}, ${relationship}, ${phone || null}, ${email || null}, ${isPrimary}, ${notes || null})`
    );

    console.log('[Crisis] Emergency contact created:', userId);
    return { success: true, result };
  } catch (error) {
    console.error('[Crisis] Error creating emergency contact:', error);
    return null;
  }
}

/**
 * Obter contatos de emergência do usuário
 */
export async function getUserEmergencyContacts(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const contacts = await db.execute(
      sql`SELECT id, name, relationship, phone, email, isPrimary, notes, createdAt, updatedAt
          FROM emergency_contacts 
          WHERE userId = ${userId}
          ORDER BY isPrimary DESC, name ASC`
    );

    return Array.isArray(contacts) ? contacts : [];
  } catch (error) {
    console.error('[Crisis] Error getting emergency contacts:', error);
    return [];
  }
}

/**
 * Atualizar contato de emergência
 */
export async function updateEmergencyContact(
  userId: number,
  contactId: number,
  name: string,
  relationship: string,
  phone?: string,
  email?: string,
  isPrimary = false,
  notes?: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`UPDATE emergency_contacts
        SET name = ${name},
            relationship = ${relationship},
            phone = ${phone || null},
            email = ${email || null},
            isPrimary = ${isPrimary},
            notes = ${notes || null},
            updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ${contactId} AND userId = ${userId}`
  );

  return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
}

/**
 * Deletar contato de emergência
 */
export async function deleteEmergencyContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`DELETE FROM emergency_contacts WHERE id = ${contactId} AND userId = ${userId}`
  );

  return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
}

/**
 * Criar mensagem pré-escrita
 */
export async function createPresetMessage(
  userId: number,
  title: string,
  message: string,
  category: 'help' | 'location' | 'status' | 'custom' = 'custom',
  isDefault = false
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`INSERT INTO preset_messages (userId, title, message, category, isDefault) 
          VALUES (${userId}, ${title}, ${message}, ${category}, ${isDefault})`
    );

    console.log('[Crisis] Preset message created:', userId);
    return { success: true, result };
  } catch (error) {
    console.error('[Crisis] Error creating preset message:', error);
    return null;
  }
}

/**
 * Obter mensagens pré-escritas do usuário
 */
export async function getUserPresetMessages(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const messages = await db.execute(
      sql`SELECT id, title, message, category, isDefault, useCount, createdAt, updatedAt
          FROM preset_messages 
          WHERE userId = ${userId}
          ORDER BY isDefault DESC, useCount DESC, title ASC`
    );

    return Array.isArray(messages) ? messages : [];
  } catch (error) {
    console.error('[Crisis] Error getting preset messages:', error);
    return [];
  }
}

/**
 * Atualizar mensagem pré-escrita
 */
export async function updatePresetMessage(
  userId: number,
  messageId: number,
  title: string,
  message: string,
  category: 'help' | 'location' | 'status' | 'custom' = 'custom'
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`UPDATE preset_messages
        SET title = ${title},
            message = ${message},
            category = ${category},
            updatedAt = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id = ${messageId} AND userId = ${userId}`
  );

  return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
}

/**
 * Deletar mensagem pré-escrita
 */
export async function deletePresetMessage(userId: number, messageId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.execute(
    sql`DELETE FROM preset_messages WHERE id = ${messageId} AND userId = ${userId}`
  );

  return { success: result.affectedRows > 0, affectedRows: result.affectedRows };
}

/**
 * Incrementar contador de uso de mensagem
 */
export async function incrementMessageUseCount(messageId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`UPDATE preset_messages 
          SET useCount = useCount + 1
          WHERE id = ${messageId}`
    );

    return { success: true };
  } catch (error) {
    console.error('[Crisis] Error incrementing message use count:', error);
    return null;
  }
}

/**
 * Obter todas as técnicas de crise
 */
export async function getAllCrisisTechniques() {
  const db = await getDb();
  if (!db) return [];

  try {
    const techniques = await db.execute(
      sql`SELECT id, name, description, category, duration, instructions, difficulty, effectivenessRating, usageCount
          FROM crisis_techniques 
          ORDER BY category ASC, difficulty ASC, name ASC`
    );

    return Array.isArray(techniques) ? techniques : [];
  } catch (error) {
    console.error('[Crisis] Error getting crisis techniques:', error);
    return [];
  }
}

/**
 * Obter técnicas de crise por categoria
 */
export async function getCrisisTechniquesByCategory(category: TechniqueCategory) {
  const db = await getDb();
  if (!db) return [];

  try {
    const techniques = await db.execute(
      sql`SELECT id, name, description, category, duration, instructions, difficulty, effectivenessRating, usageCount
          FROM crisis_techniques 
          WHERE category = ${category}
          ORDER BY difficulty ASC, name ASC`
    );

    return Array.isArray(techniques) ? techniques : [];
  } catch (error) {
    console.error('[Crisis] Error getting crisis techniques by category:', error);
    return [];
  }
}

/**
 * Incrementar contador de uso de técnica
 */
export async function incrementTechniqueUsageCount(techniqueId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      sql`UPDATE crisis_techniques 
          SET usageCount = usageCount + 1
          WHERE id = ${techniqueId}`
    );

    return { success: true };
  } catch (error) {
    console.error('[Crisis] Error incrementing technique usage count:', error);
    return null;
  }
}
