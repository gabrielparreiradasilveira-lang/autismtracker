export const ENV = {
  databasePath: process.env.DATABASE_PATH || "data/app.db",
  jwtSecret: process.env.JWT_SECRET || "autismtracker-dev-secret-change-me",
  ownerOpenId: process.env.OWNER_OPEN_ID || "",
  port: parseInt(process.env.PORT || "3000", 10),
  isProduction: process.env.NODE_ENV === "production",
};
