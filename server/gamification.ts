/**
 * Gamification Database Functions
 * Handles badges, challenges, rewards, and user game stats
 */

import {
  getDb,
  countMoodEntriesInRange,
  countCompletedRoutineEntriesInRange,
  countExerciseSessionsInRange,
} from "./db";
import { sql, eq, and, gte, lte } from "drizzle-orm";

/**
 * Initialize game stats for a new user
 */
export async function initializeGameStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if stats already exist
    const existing = await db.execute(
      sql`SELECT id FROM user_game_stats WHERE userId = ${userId}`
    );
    
    if (existing && existing.length > 0) {
      return existing[0];
    }

    // Create new stats
    await db.execute(
      sql`INSERT INTO user_game_stats (userId, totalPoints, level, nextLevelPoints) 
          VALUES (${userId}, 0, 1, 100)`
    );

    return { userId, totalPoints: 0, level: 1 };
  } catch (error) {
    console.error("[Gamification] Error initializing game stats:", error);
    return null;
  }
}

/**
 * Get user game stats
 */
export async function getUserGameStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`SELECT * FROM user_game_stats WHERE userId = ${userId}`
    );
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Gamification] Error getting game stats:", error);
    return null;
  }
}

/**
 * Add points to user and handle level ups
 */
export async function addPoints(userId: number, points: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get current stats
    const stats = await getUserGameStats(userId);
    if (!stats) {
      await initializeGameStats(userId);
      return addPoints(userId, points);
    }

    const statsCasted = stats as any;
    const newTotalPoints = (statsCasted?.totalPoints || 0) + points;
    const currentLevel = statsCasted?.level || 1;
    const nextLevelPoints = statsCasted?.nextLevelPoints || 100;

    let newLevel = currentLevel;
    let newNextLevelPoints = nextLevelPoints;

    // Check for level up
    if (newTotalPoints >= nextLevelPoints) {
      newLevel = currentLevel + 1;
      newNextLevelPoints = nextLevelPoints * 1.5; // Increase requirement by 50%
    }

    await db.execute(
      sql`UPDATE user_game_stats 
          SET totalPoints = ${newTotalPoints}, 
              level = ${newLevel},
              nextLevelPoints = ${newNextLevelPoints}
          WHERE userId = ${userId}`
    );

    return {
      newTotalPoints,
      newLevel,
      leveledUp: newLevel > currentLevel,
      newLevelNumber: newLevel,
    };
  } catch (error) {
    console.error("[Gamification] Error adding points:", error);
    return null;
  }
}

/**
 * Unlock a badge for a user
 */
export async function unlockBadge(userId: number, badgeId: number, notes?: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if already unlocked
    const existing = await db.execute(
      sql`SELECT id FROM user_badges WHERE userId = ${userId} AND badgeId = ${badgeId}`
    );

    if (existing && Array.isArray(existing) && existing.length > 0) {
      return { alreadyUnlocked: true };
    }

    // Unlock badge
    await db.execute(
      sql`INSERT INTO user_badges (userId, badgeId, notes) 
          VALUES (${userId}, ${badgeId}, ${notes || null})`
    );

    // Increment badge unlock count
    await db.execute(
      sql`UPDATE badges SET unlockedCount = unlockedCount + 1 WHERE id = ${badgeId}`
    );

    // Update user stats
    await db.execute(
      sql`UPDATE user_game_stats 
          SET totalBadgesUnlocked = totalBadgesUnlocked + 1
          WHERE userId = ${userId}`
    );

    return { success: true, newBadge: true };
  } catch (error) {
    console.error("[Gamification] Error unlocking badge:", error);
    return null;
  }
}

/**
 * Get user badges
 */
export async function getUserBadges(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT b.*, ub.unlockedAt, ub.progress, ub.notes
          FROM user_badges ub
          JOIN badges b ON ub.badgeId = b.id
          WHERE ub.userId = ${userId}
          ORDER BY ub.unlockedAt DESC`
    );
    return result || [];
  } catch (error) {
    console.error("[Gamification] Error getting user badges:", error);
    return [];
  }
}

/**
 * Create a new challenge
 */
export async function createChallenge(data: {
  title: string;
  description: string;
  icon: string;
  category: string;
  difficulty: string;
  goal: number;
  goalType: string;
  reward: number;
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(
      sql`INSERT INTO challenges 
          (title, description, icon, category, difficulty, goal, goalType, reward, startDate, endDate)
          VALUES (${data.title}, ${data.description}, ${data.icon}, ${data.category}, 
                  ${data.difficulty}, ${data.goal}, ${data.goalType}, ${data.reward},
                  ${data.startDate}, ${data.endDate})`
    );
    return result;
  } catch (error) {
    console.error("[Gamification] Error creating challenge:", error);
    return null;
  }
}

/**
 * Get active challenges for a user
 */
export async function getActiveChallenges(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const now = new Date();
    const result = await db.execute(
      sql`SELECT c.*, 
              COALESCE(uc.progress, 0) as userProgress,
              COALESCE(uc.completed, false) as userCompleted,
              COALESCE(uc.pointsEarned, 0) as userPointsEarned
          FROM challenges c
          LEFT JOIN user_challenges uc ON c.id = uc.challengeId AND uc.userId = ${userId}
          WHERE c.isActive = true 
          AND c.startDate <= ${now}
          AND c.endDate >= ${now}
          ORDER BY c.startDate DESC`
    );
    return result || [];
  } catch (error) {
    console.error("[Gamification] Error getting active challenges:", error);
    return [];
  }
}

/**
 * Update challenge progress
 */
export async function updateChallengeProgress(
  userId: number,
  challengeId: number,
  progress: number
) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get challenge details
    const challengeResult = await db.execute(
      sql`SELECT goal, goalType, reward FROM challenges WHERE id = ${challengeId}`
    );

    if (!challengeResult || !Array.isArray(challengeResult) || (challengeResult as any).length === 0) {
      return null;
    }

    const challenge = challengeResult[0] as any;
    const isCompleted = progress >= (challenge?.goal || 0);

    // Check if user challenge exists
    const existing = await db.execute(
      sql`SELECT id FROM user_challenges WHERE userId = ${userId} AND challengeId = ${challengeId}`
    );

    if (existing && existing.length > 0) {
      // Update existing
      await db.execute(
        sql`UPDATE user_challenges 
            SET progress = ${progress},
                completed = ${isCompleted},
                completedAt = ${isCompleted ? new Date() : null},
                pointsEarned = ${isCompleted ? (challenge?.reward || 0) : 0}
            WHERE userId = ${userId} AND challengeId = ${challengeId}`
      );
    } else {
      // Create new
      await db.execute(
        sql`INSERT INTO user_challenges 
            (userId, challengeId, progress, completed, completedAt, pointsEarned)
            VALUES (${userId}, ${challengeId}, ${progress}, ${isCompleted}, 
                    ${isCompleted ? new Date() : null}, ${isCompleted ? (challenge?.reward || 0) : 0})`
      );
    }

    // If completed, award points and update stats
    if (isCompleted) {
      await addPoints(userId, challenge?.reward || 0);
      await db.execute(
        sql`UPDATE user_game_stats 
            SET totalChallengesCompleted = totalChallengesCompleted + 1
            WHERE userId = ${userId}`
      );
    }

    return { success: true, completed: isCompleted };
  } catch (error) {
    console.error("[Gamification] Error updating challenge progress:", error);
    return null;
  }
}

/**
 * Get all available rewards
 */
export async function getAvailableRewards() {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT * FROM unlocked_rewards ORDER BY cost ASC`
    );
    return result || [];
  } catch (error) {
    console.error("[Gamification] Error getting rewards:", error);
    return [];
  }
}

/**
 * Unlock a reward for a user
 */
export async function unlockReward(userId: number, rewardId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get reward details
    const rewardResult = await db.execute(
      sql`SELECT cost FROM unlocked_rewards WHERE id = ${rewardId}`
    );

    if (!rewardResult || !Array.isArray(rewardResult) || (rewardResult as any).length === 0) {
      return { error: "Reward not found" };
    }

    const reward = rewardResult[0] as any;

    // Get user stats
    const stats = await getUserGameStats(userId);
    const totalPoints = stats && typeof stats === 'object' && 'totalPoints' in stats 
      ? (stats.totalPoints as number) 
      : 0;
    const rewardCost = reward && typeof reward === 'object' && 'cost' in reward 
      ? (reward.cost as number) 
      : 0;
    if (!stats || totalPoints < rewardCost) {
      return { error: "Not enough points" };
    }

    // Check if already unlocked
    const existing = await db.execute(
      sql`SELECT id FROM user_rewards WHERE userId = ${userId} AND rewardId = ${rewardId}`
    );

    if (existing && existing.length > 0) {
      return { error: "Reward already unlocked" };
    }

    // Unlock reward
    await db.execute(
      sql`INSERT INTO user_rewards (userId, rewardId) VALUES (${userId}, ${rewardId})`
    );

    // Deduct points
    const rewardCostForDeduct = reward && typeof reward === 'object' && 'cost' in reward 
      ? (reward.cost as number) 
      : 0;
    await db.execute(
      sql`UPDATE user_game_stats 
          SET totalPoints = totalPoints - ${rewardCostForDeduct}
          WHERE userId = ${userId}`
    );

    return { success: true };
  } catch (error) {
    console.error("[Gamification] Error unlocking reward:", error);
    return null;
  }
}

/**
 * Get user rewards
 */
export async function getUserRewards(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT ur.*, r.title, r.description, r.type, r.icon, r.config, r.cost
          FROM user_rewards ur
          JOIN unlocked_rewards r ON ur.rewardId = r.id
          WHERE ur.userId = ${userId}
          ORDER BY ur.unlockedAt DESC`
    );
    return result || [];
  } catch (error) {
    console.error("[Gamification] Error getting user rewards:", error);
    return [];
  }
}

/**
 * Update user streak
 */
export async function updateUserStreak(userId: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return null;

  try {
    const stats = await getUserGameStats(userId);
    if (!stats) {
      await initializeGameStats(userId);
      return updateUserStreak(userId, isActive);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = stats && typeof stats === 'object' && 'lastActivityDate' in stats 
      ? new Date(stats.lastActivityDate as any) 
      : null;
    let newStreak = (stats && typeof stats === 'object' && 'currentStreak' in stats) 
      ? (stats.currentStreak as number) || 0 
      : 0;
    let newLongestStreak = (stats && typeof stats === 'object' && 'longestStreak' in stats) 
      ? (stats.longestStreak as number) || 0 
      : 0;

    if (isActive) {
      if (!lastActivity) {
        // First activity
        newStreak = 1;
      } else {
        const lastDate = new Date(lastActivity);
        lastDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Same day, no change
          newStreak = (stats && typeof stats === 'object' && 'currentStreak' in stats) 
            ? (stats.currentStreak as number) || 1 
            : 1;
        } else if (daysDiff === 1) {
          // Consecutive day
          const currentStreak = (stats && typeof stats === 'object' && 'currentStreak' in stats) 
            ? (stats.currentStreak as number) || 0 
            : 0;
          newStreak = currentStreak + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      }

      // Update longest streak if needed
      const longestStreak = (stats && typeof stats === 'object' && 'longestStreak' in stats) 
        ? (stats.longestStreak as number) || 0 
        : 0;
      if (newStreak > longestStreak) {
        newLongestStreak = newStreak;
      }
    }

    await db.execute(
      sql`UPDATE user_game_stats 
          SET currentStreak = ${newStreak},
              longestStreak = ${newLongestStreak},
              lastActivityDate = ${today}
          WHERE userId = ${userId}`
    );

    return { currentStreak: newStreak, longestStreak: newLongestStreak };
  } catch (error) {
    console.error("[Gamification] Error updating streak:", error);
    return null;
  }
}

/**
 * Unlock a badge by its seeded name (server/seeds.ts), so callers don't
 * need to know/hardcode badge ids. No-op if the name doesn't match a
 * seeded badge; delegates to unlockBadge, which is already idempotent.
 */
export async function unlockBadgeByName(userId: number, name: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const badgeResult = await db.execute(
      sql`SELECT id FROM badges WHERE name = ${name} LIMIT 1`
    );

    if (!badgeResult || !Array.isArray(badgeResult) || badgeResult.length === 0) {
      return null;
    }

    const badgeId = (badgeResult[0] as any).id;
    return await unlockBadge(userId, badgeId);
  } catch (error) {
    console.error("[Gamification] Error unlocking badge by name:", error);
    return null;
  }
}

/**
 * Central hook other features call whenever the user does something that
 * should count toward gamification: bumps the global activity streak,
 * awards points, and unlocks the two badges tied to global progress
 * (reaching level 10, reaching a 30-day streak). Per-feature badges
 * (first mood entry, routine milestones, etc.) are checked by the caller,
 * since only it knows the feature-specific counts involved.
 */
export async function recordActivity(userId: number, points: number) {
  const streakResult = await updateUserStreak(userId, true);
  const pointsResult = await addPoints(userId, points);

  if (pointsResult && pointsResult.newLevel >= 10) {
    await unlockBadgeByName(userId, "Lenda do Bem-estar");
  }
  if (streakResult && streakResult.currentStreak >= 30) {
    await unlockBadgeByName(userId, "Constância Total");
  }

  return { points: pointsResult, streak: streakResult };
}

const CHALLENGE_COUNTERS: Record<
  string,
  (userId: number, start: Date, end: Date) => Promise<number>
> = {
  mood: countMoodEntriesInRange,
  routine: countCompletedRoutineEntriesInRange,
  breathing: (userId, start, end) => countExerciseSessionsInRange(userId, "breathing", start, end),
};

/**
 * Recomputes and syncs progress on every active "count"-goal challenge in
 * the given category (e.g. "Semana do Humor" for category "mood"), using
 * each challenge's own date window. Safe to call after every relevant
 * action — updateChallengeProgress is idempotent per challenge.
 */
export async function syncCountChallenges(userId: number, category: string) {
  const counter = CHALLENGE_COUNTERS[category];
  if (!counter) return;

  const db = await getDb();
  if (!db) return;

  try {
    const now = new Date();
    const activeChallenges = await db.execute(
      sql`SELECT id, startDate, endDate FROM challenges
          WHERE isActive = 1 AND category = ${category} AND goalType = 'count'
          AND startDate <= ${now} AND endDate >= ${now}`
    );

    if (!activeChallenges || !Array.isArray(activeChallenges)) return;

    for (const challenge of activeChallenges as any[]) {
      const count = await counter(userId, new Date(challenge.startDate), new Date(challenge.endDate));
      await updateChallengeProgress(userId, challenge.id, count);
    }
  } catch (error) {
    console.error("[Gamification] Error syncing count challenges:", error);
  }
}

/**
 * Posição do próprio usuário, sem expor ninguém.
 *
 * O ranking anterior listava id, nome e pontos de todos os usuários e era
 * acessível sem autenticação. Num app de saúde mental, constar nessa lista
 * já revela que a pessoa usa o app, e o schema não tem nenhum
 * consentimento para isso. Devolvemos apenas números agregados.
 */
export async function getUserRanking(userId: number) {
  const db = await getDb();
  if (!db) return { position: null, totalUsers: 0, totalPoints: 0 };

  try {
    const stats = (await getUserGameStats(userId)) as { totalPoints?: number } | null;
    const totalPoints = stats?.totalPoints ?? 0;

    const totalRows = await db.execute(
      sql`SELECT COUNT(*) as total FROM user_game_stats`
    );
    const aheadRows = await db.execute(
      sql`SELECT COUNT(*) as ahead FROM user_game_stats WHERE totalPoints > ${totalPoints}`
    );

    const totalUsers = Number((totalRows?.[0] as any)?.total ?? 0);
    const ahead = Number((aheadRows?.[0] as any)?.ahead ?? 0);

    return {
      // Sem estatísticas ainda, o usuário não tem posição definida.
      position: stats ? ahead + 1 : null,
      totalUsers,
      totalPoints,
    };
  } catch (error) {
    console.error("[Gamification] Error getting user ranking:", error);
    return { position: null, totalUsers: 0, totalPoints: 0 };
  }
}
