/**
 * Testes de segurança escritos como ataque.
 *
 * Cada caso reproduz uma exploração que a auditoria executou de verdade
 * contra o servidor (duas contas, IDs sequenciais) e afirma que agora
 * falha. Para cada ataque há o par legítimo: o dono continua conseguindo
 * agir sobre o próprio registro — sem isso, "bloquear todo mundo"
 * passaria como correção válida e quebraria o uso normal.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { LEAKED_SECRET, resolveJwtSecret } from "./_core/env";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function ctx(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "sec-user-" + userId,
    email: `sec${userId}@example.com`,
    name: "Sec User " + userId,
    loginMethod: "password",
    idade: null,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const anon = appRouter.createCaller({
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
});

/** Par de contas distintas por bloco, para não cruzar estado entre testes. */
function pair(base: number) {
  return {
    alice: appRouter.createCaller(ctx(base)),
    bob: appRouter.createCaller(ctx(base + 1)),
  };
}

describe("IDOR: contatos de emergência", () => {
  it("Bob não apaga o contato de emergência da Alice", async () => {
    const { alice, bob } = pair(7100);
    await alice.crisis.createEmergencyContact({ name: "Mãe", relationship: "Mãe" });
    const [contato] = await alice.crisis.getEmergencyContacts();

    await expect(
      bob.crisis.deleteEmergencyContact({ contactId: contato.id })
    ).rejects.toThrow();

    expect(await alice.crisis.getEmergencyContacts()).toHaveLength(1);
  });

  it("Bob não altera o contato de emergência da Alice", async () => {
    const { alice, bob } = pair(7110);
    await alice.crisis.createEmergencyContact({ name: "Pai", relationship: "Pai" });
    const [contato] = await alice.crisis.getEmergencyContacts();

    await expect(
      bob.crisis.updateEmergencyContact({
        contactId: contato.id,
        name: "Invadido",
        relationship: "Invadido",
      })
    ).rejects.toThrow();

    const [depois] = await alice.crisis.getEmergencyContacts();
    expect(depois.name).toBe("Pai");
  });

  it("Alice apaga e altera o próprio contato normalmente", async () => {
    const { alice } = pair(7120);
    await alice.crisis.createEmergencyContact({ name: "Irmã", relationship: "Irmã" });
    const [contato] = await alice.crisis.getEmergencyContacts();

    await alice.crisis.updateEmergencyContact({
      contactId: contato.id,
      name: "Irmã mais velha",
      relationship: "Irmã",
    });
    const [atualizado] = await alice.crisis.getEmergencyContacts();
    expect(atualizado.name).toBe("Irmã mais velha");

    await alice.crisis.deleteEmergencyContact({ contactId: contato.id });
    expect(await alice.crisis.getEmergencyContacts()).toHaveLength(0);
  });
});

describe("IDOR: mensagens pré-escritas de crise", () => {
  it("Bob não apaga nem altera a mensagem da Alice", async () => {
    const { alice, bob } = pair(7200);
    await alice.crisis.createPresetMessage({ title: "Preciso de ajuda", message: "Estou em crise" });
    const [msg] = await alice.crisis.getPresetMessages();

    await expect(
      bob.crisis.deletePresetMessage({ messageId: msg.id })
    ).rejects.toThrow();
    await expect(
      bob.crisis.updatePresetMessage({ messageId: msg.id, title: "x", message: "y" })
    ).rejects.toThrow();

    const [intacta] = await alice.crisis.getPresetMessages();
    expect(intacta.title).toBe("Preciso de ajuda");
  });

  it("Alice altera e apaga a própria mensagem", async () => {
    const { alice } = pair(7210);
    await alice.crisis.createPresetMessage({ title: "Original", message: "corpo" });
    const [msg] = await alice.crisis.getPresetMessages();

    await alice.crisis.updatePresetMessage({ messageId: msg.id, title: "Editada", message: "corpo" });
    const [editada] = await alice.crisis.getPresetMessages();
    expect(editada.title).toBe("Editada");

    await alice.crisis.deletePresetMessage({ messageId: msg.id });
    expect(await alice.crisis.getPresetMessages()).toHaveLength(0);
  });
});

describe("IDOR: eventos de crise", () => {
  it("Bob não resolve a crise da Alice — nem ganha pontos por isso", async () => {
    const { alice, bob } = pair(7300);
    const criada: any = await alice.crisis.createCrisisEvent({ severity: "critical" });
    const crisisId = criada?.result?.insertId ?? criada?.insertId;
    expect(crisisId).toBeGreaterThan(0);

    const pontosAntes = ((await bob.gamification.getStats()) as any)?.totalPoints ?? 0;

    await expect(
      bob.crisis.resolveCrisisEvent({ crisisId, duration: 1, techniquesUsed: [] })
    ).rejects.toThrow();

    const [evento]: any = await alice.crisis.getCrisisEvents();
    expect(evento.resolved).toBeFalsy();

    const pontosDepois = ((await bob.gamification.getStats()) as any)?.totalPoints ?? 0;
    expect(pontosDepois).toBe(pontosAntes);
  });

  it("Alice resolve a própria crise", async () => {
    const { alice } = pair(7310);
    const criada: any = await alice.crisis.createCrisisEvent({ severity: "medium" });
    const crisisId = criada?.result?.insertId ?? criada?.insertId;

    await alice.crisis.resolveCrisisEvent({
      crisisId,
      duration: 10,
      techniquesUsed: ["respiração"],
    });

    const [evento]: any = await alice.crisis.getCrisisEvents();
    expect(evento.resolved).toBeTruthy();
  });
});

describe("IDOR: notificações", () => {
  it("Bob não marca como lida nem apaga notificação de id arbitrário", async () => {
    const { bob } = pair(7400);
    // Não há notificação de Bob; qualquer id que ele informe é de outro
    // usuário ou inexistente — os dois casos devem ser recusados.
    await expect(bob.notifications.markAsRead({ notificationId: 1 })).rejects.toThrow();
    await expect(bob.notifications.deleteNotification({ notificationId: 1 })).rejects.toThrow();
  });
});

describe("Ranking não expõe outros usuários", () => {
  it("exige autenticação", async () => {
    await expect(anon.gamification.getMyRanking()).rejects.toThrow();
  });

  it("devolve só posição e totais, sem nome de ninguém", async () => {
    const { alice } = pair(7500);
    await alice.mood.create({ moodLevel: 7, anxietyLevel: 3, stressLevel: 3, energyLevel: 7 });

    const ranking = await alice.gamification.getMyRanking();

    expect(Object.keys(ranking).sort()).toEqual(["position", "totalPoints", "totalUsers"]);
    expect(JSON.stringify(ranking)).not.toContain("Sec User");
  });
});

describe("Segredo de sessão", () => {
  const novaPasta = () => mkdtempSync(path.join(tmpdir(), "sec-"));

  it("usa JWT_SECRET quando definido", () => {
    const dir = novaPasta();
    expect(resolveJwtSecret(path.join(dir, "app.db"), "segredo-real-do-ambiente")).toBe(
      "segredo-real-do-ambiente"
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("nunca aceita o segredo que vazou no repositório", () => {
    const dir = novaPasta();
    const secret = resolveJwtSecret(path.join(dir, "app.db"), LEAKED_SECRET);
    expect(secret).not.toBe(LEAKED_SECRET);
    expect(secret.length).toBeGreaterThanOrEqual(32);
    rmSync(dir, { recursive: true, force: true });
  });

  it("gera, persiste e reaproveita o mesmo segredo entre reinícios", () => {
    const dir = novaPasta();
    const dbPath = path.join(dir, "app.db");

    const primeiro = resolveJwtSecret(dbPath, undefined);
    expect(existsSync(path.join(dir, ".session-secret"))).toBe(true);
    expect(readFileSync(path.join(dir, ".session-secret"), "utf8").trim()).toBe(primeiro);

    // Segundo boot: precisa reaproveitar, senão todo restart desloga todos.
    expect(resolveJwtSecret(dbPath, undefined)).toBe(primeiro);

    rmSync(dir, { recursive: true, force: true });
  });

  it("não lança quando não consegue gravar — o servidor precisa subir mesmo assim", () => {
    // /dev/null não é diretório, então mkdirSync falha com ENOTDIR na hora.
    // (Um caminho sob /proc trava o mkdirSync neste ambiente.)
    const inacessivel = "/dev/null/impossivel/app.db";
    let secret = "";
    expect(() => {
      secret = resolveJwtSecret(inacessivel, undefined);
    }).not.toThrow();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    expect(secret).not.toBe(LEAKED_SECRET);
  });
});
