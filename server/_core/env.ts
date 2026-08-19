import crypto from "crypto";
import fs from "fs";
import path from "path";

const databasePath = process.env.DATABASE_PATH || "data/app.db";

/**
 * Valor que ficava embutido no código como fallback do segredo de sessão.
 * Está publicado no repositório, então qualquer pessoa com acesso a ele
 * conseguiria forjar um cookie para qualquer usuário. Nunca mais é aceito.
 */
export const LEAKED_SECRET = "autismtracker-dev-secret-change-me";

/**
 * Resolve o segredo que assina as sessões.
 *
 * A intenção é nunca impedir o servidor de subir: derrubar o boot por
 * falta de variável deixaria o app fora do ar (e, com
 * restartPolicyMaxRetries no Railway, derrubado de vez). Então, sem
 * JWT_SECRET, geramos um segredo forte e o guardamos ao lado do banco —
 * que no Railway fica em volume persistente, o mesmo lugar de app.db.
 *
 * Ordem: variável de ambiente > arquivo já existente > gerar e gravar >
 * gerar só em memória (disco somente leitura).
 */
export function resolveJwtSecret(
  dbPath: string = databasePath,
  fromEnv: string | undefined = process.env.JWT_SECRET
): string {
  if (fromEnv && fromEnv !== LEAKED_SECRET) {
    return fromEnv;
  }
  if (fromEnv === LEAKED_SECRET) {
    console.warn(
      "[Segurança] JWT_SECRET está com o valor de exemplo que consta no repositório. " +
        "Ignorando e usando um segredo gerado localmente."
    );
  }

  const secretFile =
    dbPath === ":memory:"
      ? path.resolve("data/.session-secret")
      : path.resolve(path.dirname(dbPath), ".session-secret");

  try {
    const existing = fs.readFileSync(secretFile, "utf8").trim();
    if (existing.length >= 32 && existing !== LEAKED_SECRET) {
      return existing;
    }
  } catch {
    // Arquivo ainda não existe: seguimos para a geração.
  }

  const generated = crypto.randomBytes(32).toString("hex");

  try {
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.log(`[Segurança] Segredo de sessão gerado e salvo em ${secretFile}.`);
  } catch (error) {
    // Disco somente leitura: o app sobe mesmo assim, mas as sessões não
    // sobrevivem a um restart, porque o segredo muda a cada boot.
    console.warn(
      "[Segurança] Não foi possível gravar o segredo de sessão em disco " +
        `(${secretFile}). Usando um segredo em memória: os usuários precisarão ` +
        "entrar de novo a cada reinício. Defina JWT_SECRET para resolver.",
      error
    );
  }

  return generated;
}

export const ENV = {
  databasePath,
  jwtSecret: resolveJwtSecret(),
  ownerOpenId: process.env.OWNER_OPEN_ID || "",
  port: parseInt(process.env.PORT || "3000", 10),
  isProduction: process.env.NODE_ENV === "production",
};
