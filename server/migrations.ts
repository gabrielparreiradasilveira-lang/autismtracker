/**
 * DDL idempotente do banco SQLite. Executado no primeiro getDb().
 * Tabelas usadas via query builder do Drizzle guardam datas como INTEGER (ms epoch);
 * tabelas acessadas por SQL cru guardam datas como TEXT ISO-8601 (UTC).
 */
export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openId TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT UNIQUE,
  passwordHash TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  idade INTEGER,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  lastSignedIn INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mood_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  date INTEGER NOT NULL,
  moodLevel INTEGER NOT NULL,
  anxietyLevel INTEGER NOT NULL,
  stressLevel INTEGER NOT NULL,
  energyLevel INTEGER NOT NULL,
  notes TEXT,
  triggers TEXT
);

CREATE TABLE IF NOT EXISTS sensory_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  severity INTEGER NOT NULL,
  description TEXT,
  copingStrategy TEXT,
  frequency TEXT NOT NULL,
  lastOccurred INTEGER,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tasks TEXT,
  timeOfDay TEXT NOT NULL,
  estimatedDuration INTEGER,
  points INTEGER NOT NULL DEFAULT 10,
  currentStreak INTEGER NOT NULL DEFAULT 0,
  longestStreak INTEGER NOT NULL DEFAULT 0,
  totalCompletions INTEGER NOT NULL DEFAULT 0,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS routine_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  routineId INTEGER NOT NULL,
  date INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completedTasks TEXT,
  timeSpent INTEGER,
  pointsEarned INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS symptom_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  date INTEGER NOT NULL,
  symptomType TEXT NOT NULL,
  severity INTEGER NOT NULL,
  duration INTEGER,
  triggers TEXT,
  interventions TEXT,
  effectiveness INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  time TEXT NOT NULL,
  daysOfWeek TEXT,
  isActive INTEGER NOT NULL DEFAULT 1,
  isSmart INTEGER NOT NULL DEFAULT 0,
  preferredTimes TEXT,
  lastTriggered INTEGER,
  responseCount INTEGER NOT NULL DEFAULT 0,
  nextDue INTEGER,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS techniques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  instructions TEXT,
  duration INTEGER,
  difficulty TEXT NOT NULL,
  tags TEXT,
  isPublic INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_techniques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  techniqueId INTEGER NOT NULL,
  isFavorite INTEGER NOT NULL DEFAULT 0,
  effectiveness INTEGER,
  notes TEXT,
  usageCount INTEGER NOT NULL DEFAULT 0,
  lastUsed INTEGER
);

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  exerciseType TEXT NOT NULL,
  duration INTEGER NOT NULL,
  pattern TEXT,
  completed INTEGER NOT NULL DEFAULT 1,
  rating INTEGER,
  notes TEXT,
  startedAt INTEGER NOT NULL,
  completedAt INTEGER
);

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'light',
  fontSize TEXT NOT NULL DEFAULT 'medium',
  highContrast INTEGER NOT NULL DEFAULT 0,
  reduceMotion INTEGER NOT NULL DEFAULT 0,
  soundEnabled INTEGER NOT NULL DEFAULT 1,
  notificationsEnabled INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  exportFormat TEXT NOT NULL DEFAULT 'json',
  privacyLevel TEXT NOT NULL DEFAULT 'private',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL UNIQUE,
  totalPoints INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  nextLevelPoints INTEGER NOT NULL DEFAULT 100,
  totalBadgesUnlocked INTEGER NOT NULL DEFAULT 0,
  totalChallengesCompleted INTEGER NOT NULL DEFAULT 0,
  currentStreak INTEGER NOT NULL DEFAULT 0,
  longestStreak INTEGER NOT NULL DEFAULT 0,
  lastActivityDate TEXT,
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common',
  unlockedCount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  badgeId INTEGER NOT NULL,
  unlockedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  progress INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  goal INTEGER NOT NULL,
  goalType TEXT NOT NULL,
  reward INTEGER NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  challengeId INTEGER NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completedAt TEXT,
  pointsEarned INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS unlocked_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  cost INTEGER NOT NULL,
  icon TEXT NOT NULL,
  config TEXT,
  isLimited INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  rewardId INTEGER NOT NULL,
  unlockedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  isActive INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT,
  data TEXT,
  scheduledFor TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  sentAt TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS crisis_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  severity TEXT NOT NULL,
  triggers TEXT,
  techniquesUsed TEXT,
  duration INTEGER,
  notes TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  startedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  resolvedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  isPrimary INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS preset_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  isDefault INTEGER NOT NULL DEFAULT 0,
  useCount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS crisis_techniques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INTEGER,
  instructions TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  effectivenessRating INTEGER NOT NULL DEFAULT 0,
  usageCount INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user ON mood_entries(userId, date);
CREATE INDEX IF NOT EXISTS idx_routine_entries_user ON routine_entries(userId, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, read);
CREATE INDEX IF NOT EXISTS idx_crisis_events_user ON crisis_events(userId, startedAt);
`;
