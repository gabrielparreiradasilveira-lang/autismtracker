import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createSessionToken } from "./_core/context";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as gamification from "./gamification";
import { generateInsights } from "./insights";
import * as notifications from "./notifications";
import * as crisis from "./crisis";

/**
 * Número mínimo de ocorrências para uma média por gatilho ser exibida
 * como correlação. Abaixo disso a média é ruído de uma amostra pequena.
 */
const MIN_OCCURRENCES_FOR_CORRELATION = 3;

/**
 * Converte "nenhuma linha afetada" em FORBIDDEN.
 *
 * As mutations por id filtram por userId no WHERE, então zero linhas
 * significa que o registro não existe OU é de outra pessoa. A mensagem é
 * a mesma nos dois casos de propósito: distinguir revelaria a existência
 * de registros alheios.
 */
function assertOwned(result: { affectedRows: number } | null) {
  if (!result || result.affectedRows === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Registro não encontrado" });
  }
  return { success: true } as const;
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    signup: publicProcedure
      .input(z.object({
        name: z.string().min(1, "Informe seu nome"),
        email: z.string().email("E-mail inválido"),
        password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const existing = await db.getUserByEmail(email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este e-mail" });
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        const created = await db.createUser({
          openId: `local:${randomUUID()}`,
          name: input.name.trim(),
          email,
          passwordHash,
          loginMethod: "password",
        });

        const token = createSessionToken(created.id);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true } as const;
      }),

    signin: publicProcedure
      .input(z.object({
        email: z.string().email("E-mail inválido"),
        password: z.string().min(1, "Informe a senha"),
      }))
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const user = await db.getUserByEmail(email);
        if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });
        }

        await db.updateUserLastSignedIn(user.id);
        const token = createSessionToken(user.id);
        ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  mood: router({
    create: protectedProcedure
      .input(z.object({
        moodLevel: z.number().min(1).max(10),
        anxietyLevel: z.number().min(1).max(10),
        stressLevel: z.number().min(1).max(10),
        energyLevel: z.number().min(1).max(10),
        notes: z.string().optional(),
        triggers: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createMoodEntry({
          userId: ctx.user.id,
          moodLevel: input.moodLevel,
          anxietyLevel: input.anxietyLevel,
          stressLevel: input.stressLevel,
          energyLevel: input.energyLevel,
          notes: input.notes,
          triggers: input.triggers || null,
          date: new Date(),
        });

        await gamification.recordActivity(ctx.user.id, 5);
        await gamification.syncCountChallenges(ctx.user.id, "mood");

        const [entryCount, moodStreak] = await Promise.all([
          db.getMoodEntriesByUser(ctx.user.id).then((entries) => entries.length),
          db.getMoodStreak(ctx.user.id),
        ]);
        if (entryCount === 1) {
          await gamification.unlockBadgeByName(ctx.user.id, "Primeiro Passo");
        }
        if (moodStreak >= 7) {
          await gamification.unlockBadgeByName(ctx.user.id, "Semana Consciente");
        }

        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getMoodEntriesByUser(
          ctx.user.id,
          input?.startDate,
          input?.endDate
        );
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteMoodEntry(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  triggers: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.string(),
        severity: z.number().min(1).max(10),
        description: z.string().optional(),
        copingStrategy: z.string().optional(),
        frequency: z.string(),
        lastOccurred: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createSensoryTrigger({
          userId: ctx.user.id,
          name: input.name,
          category: input.category,
          severity: input.severity,
          description: input.description,
          copingStrategy: input.copingStrategy,
          frequency: input.frequency,
          lastOccurred: input.lastOccurred,
          createdAt: new Date(),
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSensoryTriggersByUser(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        category: z.string().optional(),
        severity: z.number().min(1).max(10).optional(),
        description: z.string().optional(),
        copingStrategy: z.string().optional(),
        frequency: z.string().optional(),
        lastOccurred: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateSensoryTrigger(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSensoryTrigger(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  routines: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        tasks: z.array(z.string()),
        timeOfDay: z.string(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createRoutine({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          tasks: input.tasks || null,
          timeOfDay: input.timeOfDay,
          isActive: input.isActive ?? true,
          createdAt: new Date(),
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRoutinesByUser(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        tasks: z.array(z.string()).optional(),
        timeOfDay: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateRoutine(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteRoutine(input.id, ctx.user.id);
        return { success: true };
      }),

    entries: router({
      create: protectedProcedure
        .input(z.object({
          routineId: z.number(),
          completed: z.boolean(),
          completedTasks: z.array(z.string()).optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          await db.createRoutineEntry({
            userId: ctx.user.id,
            routineId: input.routineId,
            completed: input.completed,
            completedTasks: input.completedTasks || null,
            notes: input.notes,
            date: new Date(),
          });
          return { success: true };
        }),

      list: protectedProcedure
        .input(z.object({
          routineId: z.number().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
          return await db.getRoutineEntriesByUser(ctx.user.id, input?.routineId);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          completed: z.boolean().optional(),
          completedTasks: z.array(z.string()).optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          await db.updateRoutineEntry(id, ctx.user.id, data);
          return { success: true };
        }),

      toggleTask: protectedProcedure
        .input(z.object({
          routineId: z.number(),
          taskIndex: z.number(),
          timezoneOffsetMinutes: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
          const result = await db.toggleRoutineTask(
            ctx.user.id,
            input.routineId,
            input.taskIndex,
            input.timezoneOffsetMinutes
          );

          if (result.completed) {
            const userRoutines = await db.getRoutinesByUser(ctx.user.id);
            const routine = userRoutines.find((r) => r.id === input.routineId);

            await gamification.recordActivity(ctx.user.id, routine?.points ?? 10);
            await gamification.syncCountChallenges(ctx.user.id, "routine");

            const totalCompletions = userRoutines.reduce((sum, r) => sum + r.totalCompletions, 0);
            if (totalCompletions >= 10) {
              await gamification.unlockBadgeByName(ctx.user.id, "Mestre da Rotina");
            }
            if (routine && routine.currentStreak >= 7) {
              await gamification.unlockBadgeByName(ctx.user.id, "Sequência de Fogo");
            }
          }

          return result;
        }),

      today: protectedProcedure
        .input(z.object({
          timezoneOffsetMinutes: z.number(),
        }))
        .query(async ({ ctx, input }) => {
          return await db.getTodayRoutineEntries(ctx.user.id, input.timezoneOffsetMinutes);
        }),
    }),
  }),

  exercises: router({
    create: protectedProcedure
      .input(z.object({
        exerciseType: z.string(),
        duration: z.number(),
        pattern: z.string().optional(),
        completed: z.boolean().optional(),
        rating: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
        completedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const completed = input.completed ?? true;

        await db.createExerciseSession({
          userId: ctx.user.id,
          exerciseType: input.exerciseType,
          duration: input.duration,
          pattern: input.pattern,
          completed,
          rating: input.rating,
          notes: input.notes,
          startedAt: new Date(),
          completedAt: input.completedAt,
        });

        if (completed && input.exerciseType === "breathing") {
          await gamification.recordActivity(ctx.user.id, 5);
          await gamification.syncCountChallenges(ctx.user.id, "breathing");

          const sessions = await db.getExerciseSessionsByUser(ctx.user.id);
          const breathingCount = sessions.filter(
            (s) => s.exerciseType === "breathing" && s.completed
          ).length;
          if (breathingCount >= 5) {
            await gamification.unlockBadgeByName(ctx.user.id, "Respirador Zen");
          }
        }

        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getExerciseSessionsByUser(ctx.user.id);
    }),
  }),

  analytics: router({
    /**
     * Insights acionáveis cruzando rotinas, sintomas, gatilhos e técnicas.
     * Devolve também `missing`: o que falta registrar para desbloquear
     * cada análise ainda indisponível.
     */
    insights: protectedProcedure.query(async ({ ctx }) => {
      return await generateInsights(ctx.user.id);
    }),

    patterns: protectedProcedure.query(async ({ ctx }) => {
      const moodEntries = await db.getMoodEntriesByUser(ctx.user.id);
      const triggers = await db.getSensoryTriggersByUser(ctx.user.id);
      
      // Calculate averages
      const avgMood = moodEntries.length > 0
        ? moodEntries.reduce((sum, e) => sum + e.moodLevel, 0) / moodEntries.length
        : 0;
      const avgAnxiety = moodEntries.length > 0
        ? moodEntries.reduce((sum, e) => sum + e.anxietyLevel, 0) / moodEntries.length
        : 0;
      const avgStress = moodEntries.length > 0
        ? moodEntries.reduce((sum, e) => sum + e.stressLevel, 0) / moodEntries.length
        : 0;
      const avgEnergy = moodEntries.length > 0
        ? moodEntries.reduce((sum, e) => sum + e.energyLevel, 0) / moodEntries.length
        : 0;

      // Group by day of week
      const byDayOfWeek = moodEntries.reduce((acc, entry) => {
        const day = new Date(entry.date).getDay();
        if (!acc[day]) acc[day] = [];
        acc[day].push(entry);
        return acc;
      }, {} as Record<number, typeof moodEntries>);

      // Trigger frequency
      const triggerFrequency = triggers.reduce((acc, trigger) => {
        acc[trigger.category] = (acc[trigger.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        averages: { mood: avgMood, anxiety: avgAnxiety, stress: avgStress, energy: avgEnergy },
        byDayOfWeek,
        triggerFrequency,
        totalEntries: moodEntries.length,
        totalTriggers: triggers.length,
      };
    }),

    correlations: protectedProcedure.query(async ({ ctx }) => {
      const moodEntries = await db.getMoodEntriesByUser(ctx.user.id);
      const triggers = await db.getSensoryTriggersByUser(ctx.user.id);

      // Correlate mood with triggers
      const triggerImpact = moodEntries
        .filter(e => e.triggers && e.triggers.length > 0)
        .reduce((acc, entry) => {
          entry.triggers?.forEach((trigger: string) => {
            if (!acc[trigger]) {
              acc[trigger] = { count: 0, totalMood: 0, totalAnxiety: 0 };
            }
            acc[trigger].count++;
            acc[trigger].totalMood += entry.moodLevel;
            acc[trigger].totalAnxiety += entry.anxietyLevel;
          });
          return acc;
        }, {} as Record<string, { count: number; totalMood: number; totalAnxiety: number }>);

      const all = Object.entries(triggerImpact).map(([trigger, data]) => ({
        trigger,
        avgMood: data.totalMood / data.count,
        avgAnxiety: data.totalAnxiety / data.count,
        occurrences: data.count,
      }));

      // Um gatilho registrado uma ou duas vezes não sustenta uma média:
      // antes, um único registro ruim podia encabeçar o ranking como
      // "Impacto Alto". Abaixo do limiar ele sai da lista e vira apenas
      // uma contagem, para o usuário saber que existe e falta registrar.
      const correlations = all.filter((c) => c.occurrences >= MIN_OCCURRENCES_FOR_CORRELATION);
      const insufficientSample = all.filter((c) => c.occurrences < MIN_OCCURRENCES_FOR_CORRELATION);

      return {
        correlations,
        insufficientSample: {
          count: insufficientSample.length,
          triggers: insufficientSample.map((c) => c.trigger),
          minOccurrences: MIN_OCCURRENCES_FOR_CORRELATION,
        },
      };
    }),

    /**
     * Compara a média dos últimos 7 registros com a média histórica.
     * NÃO é previsão: nada aqui projeta o futuro, apenas descreve duas
     * janelas de tempo. Os nomes dos campos dizem isso explicitamente,
     * e no lugar de um "% de confiança" (que antes media só volume de
     * dados) devolvemos tamanho da amostra e dispersão — que é o que
     * de fato indica se a média recente significa alguma coisa.
     */
    predictions: protectedProcedure.query(async ({ ctx }) => {
      const moodEntries = await db.getMoodEntriesByUser(ctx.user.id);

      const round = (n: number) => Math.round(n * 10) / 10;

      if (moodEntries.length < 7) {
        return {
          hasEnoughData: false as const,
          recentAverage: null,
          historicalAverage: null,
          sampleSize: moodEntries.length,
          recentSampleSize: 0,
          variability: null,
          message:
            moodEntries.length === 1
              ? "Você tem 1 registro de humor. A partir de 7 dá para comparar sua média recente com a histórica."
              : `Você tem ${moodEntries.length} registros de humor. A partir de 7 dá para comparar sua média recente com a histórica.`,
        };
      }

      const recent = moodEntries.slice(0, 7);
      const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

      const allMood = moodEntries.map((e) => e.moodLevel);
      const historicalMood = mean(allMood);

      // Desvio-padrão do humor: quanto maior, menos uma média resume os dados.
      const variability = Math.sqrt(
        mean(allMood.map((v) => (v - historicalMood) ** 2))
      );

      return {
        hasEnoughData: true as const,
        recentAverage: {
          mood: round(mean(recent.map((e) => e.moodLevel))),
          anxiety: round(mean(recent.map((e) => e.anxietyLevel))),
        },
        historicalAverage: {
          mood: round(historicalMood),
          anxiety: round(mean(moodEntries.map((e) => e.anxietyLevel))),
        },
        sampleSize: moodEntries.length,
        recentSampleSize: recent.length,
        variability: round(variability),
        message: "Comparação entre seus últimos 7 registros e todo o seu histórico.",
      };
    }),

    trends: protectedProcedure
      .input(z.object({
        days: z.number().min(7).max(90).default(30),
      }))
      .query(async ({ ctx, input }) => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        
        const moodEntries = await db.getMoodEntriesByUser(ctx.user.id, startDate);
        
        return {
          entries: moodEntries.map(e => ({
            date: e.date,
            mood: e.moodLevel,
            anxiety: e.anxietyLevel,
            stress: e.stressLevel,
            energy: e.energyLevel,
          })),
        };
      }),
  }),

  reminders: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        type: z.enum(["medication", "therapy", "selfcare", "routine", "exercise", "mood_diary"]),
        frequency: z.enum(["daily", "weekly", "monthly", "custom", "smart"]),
        time: z.string(), // HH:MM format
        daysOfWeek: z.array(z.string()).optional(),
        isSmart: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createReminder({
          userId: ctx.user.id,
          ...input,
          isActive: true,
          responseCount: 0,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserReminders(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        time: z.string().optional(),
        daysOfWeek: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateReminder(input.id, ctx.user.id, input);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteReminder(input.id, ctx.user.id);
        return { success: true };
      }),

    recordResponse: protectedProcedure
      .input(z.object({
        id: z.number(),
        responseTime: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.recordReminderResponse(input.id, ctx.user.id, input.responseTime);
        return { success: true };
      }),

    getSmartSuggestions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getSmartReminderSuggestions(ctx.user.id);
    }),
  }),

  routineAnalytics: router({
    getProgress: protectedProcedure
      .input(z.object({
        routineId: z.number().optional(),
        period: z.enum(["week", "month"]).default("week"),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getRoutineProgress(ctx.user.id, input.routineId, input.period);
      }),

    getStreaks: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRoutineStreaks(ctx.user.id);
    }),

    getCorrelations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRoutineMoodCorrelations(ctx.user.id);
    }),

    getBestTimes: protectedProcedure.query(async ({ ctx }) => {
      return await db.getBestRoutineTimes(ctx.user.id);
    }),

    getAdhesion: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month"]).default("month"),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getRoutineAdhesion(ctx.user.id, input.period);
      }),

    getUserStats: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserRoutineStats(ctx.user.id);
    }),
  }),

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSettings(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        theme: z.string().optional(),
        fontSize: z.string().optional(),
        highContrast: z.boolean().optional(),
        reduceMotion: z.boolean().optional(),
        soundEnabled: z.boolean().optional(),
        notificationsEnabled: z.boolean().optional(),
        language: z.string().optional(),
        exportFormat: z.string().optional(),
        privacyLevel: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertUserSettings(ctx.user.id, input);
        return { success: true };
      }),
  }),

  gamification: router({
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        return await gamification.getUserGameStats(ctx.user.id);
      }),

    getBadges: protectedProcedure
      .query(async ({ ctx }) => {
        return await gamification.getUserBadges(ctx.user.id);
      }),

    getActiveChallenges: protectedProcedure
      .query(async ({ ctx }) => {
        return await gamification.getActiveChallenges(ctx.user.id);
      }),

    updateChallengeProgress: protectedProcedure
      .input(z.object({
        challengeId: z.number(),
        progress: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await gamification.updateChallengeProgress(
          ctx.user.id,
          input.challengeId,
          input.progress
        );
      }),

    getAvailableRewards: protectedProcedure
      .query(async () => {
        return await gamification.getAvailableRewards();
      }),

    getUserRewards: protectedProcedure
      .query(async ({ ctx }) => {
        return await gamification.getUserRewards(ctx.user.id);
      }),

    unlockReward: protectedProcedure
      .input(z.object({
        rewardId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await gamification.unlockReward(ctx.user.id, input.rewardId);
      }),

    getMyRanking: protectedProcedure.query(async ({ ctx }) => {
      return await gamification.getUserRanking(ctx.user.id);
    }),
  }),

  notifications: router({
    subscribe: protectedProcedure
      .input(z.object({
        subscription: z.object({
          endpoint: z.string(),
          auth: z.string(),
          p256dh: z.string(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return await notifications.subscribeToPushNotifications(
          ctx.user.id,
          input.subscription
        );
      }),

    unsubscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await notifications.unsubscribeFromPushNotifications(
          ctx.user.id,
          input.endpoint
        );
      }),

    getNotifications: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await notifications.getUserNotifications(ctx.user.id, input?.limit || 20);
      }),

    markAsRead: protectedProcedure
      .input(z.object({
        notificationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(
          await notifications.markNotificationAsRead(ctx.user.id, input.notificationId)
        );
      }),

    getUnreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const count = await notifications.getUnreadNotificationCount(ctx.user.id);
        return { count };
      }),

    deleteNotification: protectedProcedure
      .input(z.object({
        notificationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(
          await notifications.deleteNotification(ctx.user.id, input.notificationId)
        );
      }),
  }),

  crisis: router({
    createCrisisEvent: protectedProcedure
      .input(z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        triggers: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await crisis.createCrisisEvent(ctx.user.id, input.severity, input.triggers);
      }),

    resolveCrisisEvent: protectedProcedure
      .input(z.object({
        crisisId: z.number(),
        duration: z.number(),
        techniquesUsed: z.array(z.string()),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await crisis.resolveCrisisEvent(
          ctx.user.id,
          input.crisisId,
          input.duration,
          input.techniquesUsed,
          input.notes
        );

        // Só premia depois de confirmar que a crise é do próprio usuário:
        // antes, resolver a crise de outra pessoa rendia 15 pontos ao atacante.
        const ok = assertOwned(result);

        await gamification.recordActivity(ctx.user.id, 15);
        await gamification.unlockBadgeByName(ctx.user.id, "Superação");

        return ok;
      }),

    getCrisisEvents: protectedProcedure
      .input(z.object({
        limit: z.number().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await crisis.getUserCrisisEvents(ctx.user.id, input?.limit || 20);
      }),

    getCrisisStats: protectedProcedure
      .query(async ({ ctx }) => {
        return await crisis.getUserCrisisStats(ctx.user.id);
      }),

    getEmergencyContacts: protectedProcedure
      .query(async ({ ctx }) => {
        return await crisis.getUserEmergencyContacts(ctx.user.id);
      }),

    createEmergencyContact: protectedProcedure
      .input(z.object({
        name: z.string(),
        relationship: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        isPrimary: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await crisis.createEmergencyContact(
          ctx.user.id,
          input.name,
          input.relationship,
          input.phone,
          input.email,
          input.isPrimary,
          input.notes
        );
      }),

    updateEmergencyContact: protectedProcedure
      .input(z.object({
        contactId: z.number(),
        name: z.string(),
        relationship: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        isPrimary: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(
          await crisis.updateEmergencyContact(
            ctx.user.id,
            input.contactId,
            input.name,
            input.relationship,
            input.phone,
            input.email,
            input.isPrimary,
            input.notes
          )
        );
      }),

    deleteEmergencyContact: protectedProcedure
      .input(z.object({
        contactId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(await crisis.deleteEmergencyContact(ctx.user.id, input.contactId));
      }),

    getPresetMessages: protectedProcedure
      .query(async ({ ctx }) => {
        return await crisis.getUserPresetMessages(ctx.user.id);
      }),

    createPresetMessage: protectedProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
        category: z.enum(['help', 'location', 'status', 'custom']).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await crisis.createPresetMessage(
          ctx.user.id,
          input.title,
          input.message,
          input.category,
          input.isDefault
        );
      }),

    updatePresetMessage: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        title: z.string(),
        message: z.string(),
        category: z.enum(['help', 'location', 'status', 'custom']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(
          await crisis.updatePresetMessage(
            ctx.user.id,
            input.messageId,
            input.title,
            input.message,
            input.category
          )
        );
      }),

    deletePresetMessage: protectedProcedure
      .input(z.object({
        messageId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return assertOwned(await crisis.deletePresetMessage(ctx.user.id, input.messageId));
      }),

    getAllCrisisTechniques: publicProcedure
      .query(async () => {
        return await crisis.getAllCrisisTechniques();
      }),

    getCrisisTechniquesByCategory: publicProcedure
      .input(z.object({
        category: z.enum(['breathing', 'grounding', 'sensory', 'movement', 'cognitive']),
      }))
      .query(async ({ input }) => {
        return await crisis.getCrisisTechniquesByCategory(input.category);
      }),
  }),

  symptoms: router({
    create: protectedProcedure
      .input(z.object({
        symptomType: z.enum([
          "social_interaction",
          "communication",
          "repetitive_behavior",
          "sensory_sensitivity",
          "focus",
          "executive_function",
        ]),
        severity: z.number().int().min(1).max(10),
        duration: z.number().int().min(1).optional(),
        triggers: z.array(z.string()).optional(),
        interventions: z.array(z.string()).optional(),
        effectiveness: z.number().int().min(1).max(10).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const entry = await db.createSymptomEntry({
          userId: ctx.user.id,
          date: new Date(),
          symptomType: input.symptomType,
          severity: input.severity,
          duration: input.duration ?? null,
          triggers: input.triggers ?? null,
          interventions: input.interventions ?? null,
          effectiveness: input.effectiveness ?? null,
          notes: input.notes ?? null,
        });
        return entry;
      }),

    list: protectedProcedure
      .input(z.object({
        symptomType: z.enum([
          "social_interaction",
          "communication",
          "repetitive_behavior",
          "sensory_sensitivity",
          "focus",
          "executive_function",
        ]).optional(),
        days: z.number().int().min(1).max(365).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getSymptomEntriesByUser(ctx.user.id, {
          symptomType: input?.symptomType,
          days: input?.days,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        symptomType: z.enum([
          "social_interaction",
          "communication",
          "repetitive_behavior",
          "sensory_sensitivity",
          "focus",
          "executive_function",
        ]),
        severity: z.number().int().min(1).max(10),
        duration: z.number().int().min(1).nullable().optional(),
        triggers: z.array(z.string()).nullable().optional(),
        interventions: z.array(z.string()).nullable().optional(),
        effectiveness: z.number().int().min(1).max(10).nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...campos } = input;
        // Campos opcionais viram null explicitamente: editar precisa
        // conseguir limpar o que estava preenchido, e `undefined` faria
        // o Drizzle ignorar a coluna.
        return assertOwned(
          await db.updateSymptomEntry(id, ctx.user.id, {
            symptomType: campos.symptomType,
            severity: campos.severity,
            duration: campos.duration ?? null,
            triggers: campos.triggers ?? null,
            interventions: campos.interventions ?? null,
            effectiveness: campos.effectiveness ?? null,
            notes: campos.notes ?? null,
          })
        );
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteSymptomEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    getAnalytics: protectedProcedure
      .input(z.object({
        days: z.number().int().min(1).max(365).default(30),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getSymptomAnalytics(ctx.user.id, input?.days ?? 30);
      }),

    getMoodCorrelation: protectedProcedure
      .input(z.object({
        days: z.number().int().min(1).max(365).default(30),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getSymptomMoodCorrelation(ctx.user.id, input?.days ?? 30);
      }),
  }),

  techniques: router({
    list: protectedProcedure
      .input(z.object({
        category: z.enum(["breathing", "grounding", "physical", "cognitive", "social"]).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const [allTechniques, userTechniques] = await Promise.all([
          db.getTechniques(input),
          db.getUserTechniquesByUser(ctx.user.id),
        ]);

        const userDataByTechniqueId = new Map(
          userTechniques.map((ut) => [ut.techniqueId, ut])
        );

        return allTechniques.map((technique) => {
          const userData = userDataByTechniqueId.get(technique.id);
          return {
            ...technique,
            isFavorite: userData?.isFavorite ?? false,
            effectiveness: userData?.effectiveness ?? null,
            notes: userData?.notes ?? null,
            usageCount: userData?.usageCount ?? 0,
            lastUsed: userData?.lastUsed ?? null,
          };
        });
      }),

    getFavorites: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserFavoriteTechniques(ctx.user.id);
    }),

    toggleFavorite: protectedProcedure
      .input(z.object({ techniqueId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return await db.toggleFavoriteTechnique(ctx.user.id, input.techniqueId);
      }),

    logUsage: protectedProcedure
      .input(z.object({
        techniqueId: z.number(),
        effectiveness: z.number().min(1).max(10),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.logTechniqueUsage(
          ctx.user.id,
          input.techniqueId,
          input.effectiveness,
          input.notes
        );

        await gamification.recordActivity(ctx.user.id, 5);

        return result;
      }),

    getAnalytics: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTechniqueAnalytics(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
