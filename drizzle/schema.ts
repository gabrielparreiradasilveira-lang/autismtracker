import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const bool = (name: string) => integer(name, { mode: "boolean" });

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email").unique(),
  passwordHash: text("passwordHash"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  idade: integer("idade"),
  createdAt: timestamp("createdAt").$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp("updatedAt").$defaultFn(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn").$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Usuário de sessão exposto ao cliente (sem hash de senha). */
export type SessionUser = Omit<User, "passwordHash">;

/**
 * Mood and Emotion Tracking
 */
export const moodEntries = sqliteTable("mood_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: timestamp("date").$defaultFn(() => new Date()).notNull(),
  moodLevel: integer("moodLevel").notNull(), // 1-10 scale
  anxietyLevel: integer("anxietyLevel").notNull(), // 1-10 scale
  stressLevel: integer("stressLevel").notNull(), // 1-10 scale
  energyLevel: integer("energyLevel").notNull(), // 1-10 scale
  notes: text("notes"),
  triggers: text("triggers", { mode: "json" }).$type<string[]>(), // Array of trigger descriptions
});

export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = typeof moodEntries.$inferInsert;

/**
 * Sensory Trigger Management
 */
export const sensoryTriggers = sqliteTable("sensory_triggers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "sound", "light", "texture", "smell", "taste", "visual", "other"
  severity: integer("severity").notNull(), // 1-10 scale
  description: text("description"),
  copingStrategy: text("copingStrategy"),
  frequency: text("frequency").notNull(), // "daily", "weekly", "monthly", "rarely"
  lastOccurred: timestamp("lastOccurred"),
  createdAt: timestamp("createdAt").$defaultFn(() => new Date()).notNull(),
});

export type SensoryTrigger = typeof sensoryTriggers.$inferSelect;
export type InsertSensoryTrigger = typeof sensoryTriggers.$inferInsert;

/**
 * Daily Routines Management
 */
export const routines = sqliteTable("routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  tasks: text("tasks", { mode: "json" }).$type<string[]>(), // Array of task descriptions
  timeOfDay: text("timeOfDay").notNull(), // "morning", "afternoon", "evening", "night"
  estimatedDuration: integer("estimatedDuration"), // in minutes
  points: integer("points").default(10).notNull(), // Points awarded for completion
  currentStreak: integer("currentStreak").default(0).notNull(), // Current consecutive days
  longestStreak: integer("longestStreak").default(0).notNull(), // Best streak record
  totalCompletions: integer("totalCompletions").default(0).notNull(), // Total times completed
  isActive: bool("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").$defaultFn(() => new Date()).notNull(),
});

export type Routine = typeof routines.$inferSelect;
export type InsertRoutine = typeof routines.$inferInsert;

export const routineEntries = sqliteTable("routine_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  routineId: integer("routineId").notNull(),
  date: timestamp("date").$defaultFn(() => new Date()).notNull(),
  completed: bool("completed").default(false).notNull(),
  completedTasks: text("completedTasks", { mode: "json" }).$type<string[]>(), // Array of completed task indices or names
  timeSpent: integer("timeSpent"), // Actual time spent in minutes
  pointsEarned: integer("pointsEarned").default(0).notNull(),
  notes: text("notes"),
});

export type RoutineEntry = typeof routineEntries.$inferSelect;
export type InsertRoutineEntry = typeof routineEntries.$inferInsert;

/**
 * Symptom Monitoring
 */
export const symptomEntries = sqliteTable("symptom_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  date: timestamp("date").$defaultFn(() => new Date()).notNull(),
  symptomType: text("symptomType").notNull(), // "social_interaction", "communication", "repetitive_behavior", "sensory_sensitivity", "focus", "executive_function"
  severity: integer("severity").notNull(), // 1-10 scale
  duration: integer("duration"), // in minutes
  triggers: text("triggers", { mode: "json" }).$type<string[]>(), // Array of potential triggers
  interventions: text("interventions", { mode: "json" }).$type<string[]>(), // Array of interventions used
  effectiveness: integer("effectiveness"), // 1-10 scale for intervention effectiveness
  notes: text("notes"),
});

export type SymptomEntry = typeof symptomEntries.$inferSelect;
export type InsertSymptomEntry = typeof symptomEntries.$inferInsert;

/**
 * Reminders and Alerts
 */
export const reminders = sqliteTable("reminders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "medication", "therapy", "selfcare", "routine", "exercise", "mood_diary"
  frequency: text("frequency").notNull(), // "daily", "weekly", "monthly", "custom", "smart"
  time: text("time").notNull(), // HH:MM format
  daysOfWeek: text("daysOfWeek", { mode: "json" }).$type<string[]>(), // ["monday", "tuesday", etc.] for weekly reminders
  isActive: bool("isActive").default(true).notNull(),
  isSmart: bool("isSmart").default(false).notNull(), // Smart reminders learn from user behavior
  preferredTimes: text("preferredTimes", { mode: "json" }).$type<string[]>(), // Learned preferred times for smart reminders
  lastTriggered: timestamp("lastTriggered"),
  responseCount: integer("responseCount").default(0).notNull(), // How many times user responded to reminder
  nextDue: timestamp("nextDue"),
  createdAt: timestamp("createdAt").$defaultFn(() => new Date()).notNull(),
});

export type Reminder = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;

/**
 * Self-Regulation Techniques Library
 */
export const techniques = sqliteTable("techniques", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "breathing", "grounding", "physical", "cognitive", "social"
  instructions: text("instructions", { mode: "json" }).$type<string[]>(), // Step-by-step instructions
  duration: integer("duration"), // estimated duration in minutes
  difficulty: text("difficulty").notNull(), // "beginner", "intermediate", "advanced"
  tags: text("tags", { mode: "json" }).$type<string[]>(), // searchable tags
  isPublic: bool("isPublic").default(true).notNull(),
});

export type Technique = typeof techniques.$inferSelect;
export type InsertTechnique = typeof techniques.$inferInsert;

export const userTechniques = sqliteTable("user_techniques", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  techniqueId: integer("techniqueId").notNull(),
  isFavorite: bool("isFavorite").default(false).notNull(),
  effectiveness: integer("effectiveness"), // 1-10 user rating
  notes: text("notes"),
  usageCount: integer("usageCount").default(0).notNull(),
  lastUsed: timestamp("lastUsed"),
});

export type UserTechnique = typeof userTechniques.$inferSelect;
export type InsertUserTechnique = typeof userTechniques.$inferInsert;

/**
 * Breathing and Relaxation Exercises
 */
export const exerciseSessions = sqliteTable("exercise_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  exerciseType: text("exerciseType").notNull(), // "breathing", "meditation", "progressive_relaxation"
  duration: integer("duration").notNull(), // in seconds
  pattern: text("pattern"), // breathing pattern used (e.g., "4-7-8")
  completed: bool("completed").default(true).notNull(),
  rating: integer("rating"), // 1-10 effectiveness rating
  notes: text("notes"),
  startedAt: timestamp("startedAt").$defaultFn(() => new Date()).notNull(),
  completedAt: timestamp("completedAt"),
});

export type ExerciseSession = typeof exerciseSessions.$inferSelect;
export type InsertExerciseSession = typeof exerciseSessions.$inferInsert;

/**
 * User Settings and Accessibility Preferences
 */
export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  theme: text("theme").default("light").notNull(), // "light", "dark", "auto"
  fontSize: text("fontSize").default("medium").notNull(), // "small", "medium", "large", "extra-large"
  highContrast: bool("highContrast").default(false).notNull(),
  reduceMotion: bool("reduceMotion").default(false).notNull(),
  soundEnabled: bool("soundEnabled").default(true).notNull(),
  notificationsEnabled: bool("notificationsEnabled").default(true).notNull(),
  language: text("language").default("pt-BR").notNull(),
  exportFormat: text("exportFormat").default("json").notNull(), // "json", "csv", "pdf"
  privacyLevel: text("privacyLevel").default("private").notNull(), // "private", "therapist-shared", "anonymous"
  createdAt: timestamp("createdAt").$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp("updatedAt").$defaultFn(() => new Date()).notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
