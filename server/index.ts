import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ENV } from "./_core/env";
import { createContext } from "./_core/context";
import { getDb } from "./db";
import { appRouter } from "./routers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await getDb();

  const app = express();
  app.use(cookieParser());

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const clientDist = path.resolve(__dirname, "../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.listen(ENV.port, () => {
    console.log(`[Server] Rodando em http://localhost:${ENV.port}`);
  });
}

main().catch((error) => {
  console.error("[Server] Falha ao iniciar:", error);
  process.exit(1);
});
