import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    include: ["server/**/*.test.ts"],
    fileParallelism: false,
    env: {
      DATABASE_PATH: "data/test.db",
    },
  },
});
