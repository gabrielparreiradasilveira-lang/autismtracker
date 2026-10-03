import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  addDays,
  diasDaSemana,
  filtrarTarefas,
  inicioDaSemana,
  progressoCurso,
  progressoHabitos,
  progressoLivro,
  rollupPercent,
  somaValores,
  toISODate,
} from "@shared/planner";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user-" + userId,
    email: `test${userId}@example.com`,
    name: "Test User",
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

describe("fórmulas do template", () => {
  it("Progresso do Tracker = floor(1000·Σ/6)/1000, igual ao Notion", () => {
    expect(progressoHabitos({})).toBe(0);
    expect(progressoHabitos({ leitura: true })).toBe(0.166);
    expect(progressoHabitos({ leitura: true, estudo: true, agua: true, treino: true })).toBe(0.666);
    expect(
      progressoHabitos({ acordarCedo: true, leitura: true, treino: true, alimentacao: true, estudo: true, agua: true })
    ).toBe(1);
  });

  it("Leitura e Cursos = round(parte/total·100)/100; sem total, vazio", () => {
    expect(progressoLivro({ paginasLidas: 50, totalPaginas: 300 })).toBe(0.17);
    expect(progressoLivro({ paginasLidas: 10, totalPaginas: 0 })).toBeNull();
    expect(progressoCurso({ aulasAssistidas: 3, aulasTotais: 4 })).toBe(0.75);
  });

  it("rollup % marcado olha só os filhos daquele pai", () => {
    const acoes = [
      { metaId: 1, completo: true },
      { metaId: 1, completo: false },
      { metaId: 2, completo: true },
    ];
    expect(rollupPercent(acoes, "metaId", 1, "completo")).toBe(0.5);
    expect(rollupPercent(acoes, "metaId", 3, "completo")).toBe(0);
  });

  it("soma em centavos não acumula erro de ponto flutuante", () => {
    expect(somaValores([{ valor: 0.1 }, { valor: 0.2 }])).toBe(0.3);
  });

  it("semana vai de segunda a domingo", () => {
    // 2026-10-03 é sábado
    expect(inicioDaSemana("2026-10-03")).toBe("2026-09-28");
    expect(diasDaSemana("2026-10-04")).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
    expect(inicioDaSemana("2026-09-28")).toBe("2026-09-28");
  });
});

describe("visualizações da base Tarefas", () => {
  const hoje = "2026-10-01"; // quinta
  const criadaHoje = new Date(2026, 9, 1, 9).toISOString();
  const criadaOntem = new Date(2026, 8, 30, 9).toISOString();
  const rows = [
    { id: 1, name: "hoje", data: hoje, feito: false, createdAt: criadaOntem },
    { id: 2, name: "hoje feita", data: hoje, feito: true, createdAt: criadaOntem },
    { id: 3, name: "atrasada", data: "2026-09-20", feito: false, createdAt: criadaOntem },
    { id: 4, name: "amanhã", data: "2026-10-02", feito: false, createdAt: criadaOntem },
    { id: 5, name: "próxima semana", data: "2026-10-07", feito: false, createdAt: criadaOntem },
    { id: 6, name: "surgiu hoje", data: null, feito: false, createdAt: criadaHoje },
    { id: 7, name: "sem data antiga", data: null, feito: false, createdAt: criadaOntem },
  ];
  const ids = (v: Parameters<typeof filtrarTarefas>[1]) => filtrarTarefas(rows, v, hoje).map((r) => r.id);

  it("cada visão aplica o filtro do original", () => {
    expect(ids("hoje")).toEqual([1]);
    expect(ids("atrasado")).toEqual([3]);
    expect(ids("amanha")).toEqual([4]);
    expect(ids("proximaSemana")).toEqual([5]);
    expect(ids("essaSemana")).toEqual([1, 4]);
    expect(ids("inbox")).toEqual([6]);
    expect(ids("semData")).toEqual([6, 7]);
    expect(ids("completo")).toEqual([2]);
    expect(ids("geral")).toHaveLength(7);
  });
});

describe("planner (router)", () => {
  it("cria, lista, atualiza e apaga uma tarefa", async () => {
    const caller = appRouter.createCaller(createAuthContext(2101));
    const t = await caller.planner.create({
      entity: "tarefas",
      data: { name: "Estudar CGA", data: "2026-10-03", contexto: ["Estudo", "Metas"], prioridade: "Urgente" },
    });
    expect(t.feito).toBe(false);
    expect(t.contexto).toEqual(["Estudo", "Metas"]);

    await caller.planner.update({ entity: "tarefas", id: t.id, data: { feito: true } });
    const lista = await caller.planner.list({ entity: "tarefas" });
    expect(lista.find((r) => r.id === t.id)?.feito).toBe(true);

    await caller.planner.delete({ entity: "tarefas", id: t.id });
    expect((await caller.planner.list({ entity: "tarefas" })).some((r) => r.id === t.id)).toBe(false);
  });

  it("recusa opção fora da lista e nome vazio", async () => {
    const caller = appRouter.createCaller(createAuthContext(2102));
    await expect(
      caller.planner.create({ entity: "tarefas", data: { name: "x", prioridade: "Para ontem" } })
    ).rejects.toThrow();
    await expect(caller.planner.create({ entity: "tarefas", data: { name: "  " } })).rejects.toThrow();
    await expect(
      caller.planner.create({ entity: "estudos", data: { name: "x", url: "javascript:alert(1)" } })
    ).rejects.toThrow();
  });

  it("Finanças: Mês vem da Data e o valor volta em reais", async () => {
    const caller = appRouter.createCaller(createAuthContext(2103));
    const s = await caller.planner.create({
      entity: "saidas",
      data: { name: "Academia", valor: 119.9, categoria: "Academia", data: "2026-03-05" },
    });
    expect(s.mes).toBe("Março");
    expect(s.valor).toBe(119.9);
    await caller.planner.update({ entity: "saidas", id: s.id, data: { data: "2026-07-01" } });
    const [atual] = await caller.planner.list({ entity: "saidas" });
    expect(atual.mes).toBe("Julho");
  });

  it("Nova Semana cria Segunda→Domingo uma vez só", async () => {
    const caller = appRouter.createCaller(createAuthContext(2104));
    const hoje = "2026-10-01";
    const r1 = await caller.planner.novaSemana({ hoje });
    expect(r1.criados).toBe(7);
    const r2 = await caller.planner.novaSemana({ hoje });
    expect(r2.criados).toBe(0);
    const dias = await caller.planner.list({ entity: "habitos" });
    expect(dias.map((d) => d.name)).toEqual(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
    expect(dias[0].data).toBe("2026-09-28");
    expect(dias[6].data).toBe("2026-10-04");
  });

  it("Metas: ação liga na meta; apagar a meta solta a ação", async () => {
    const caller = appRouter.createCaller(createAuthContext(2105));
    const meta = await caller.planner.create({
      entity: "metas",
      data: { name: "Passar no CFP", ano: "2026", prazo: "Médio Prazo" },
    });
    const a1 = await caller.planner.create({ entity: "acoes", data: { name: "Simulado 1", metaId: meta.id, completo: true } });
    await caller.planner.create({ entity: "acoes", data: { name: "Simulado 2", metaId: meta.id } });
    const acoes = await caller.planner.list({ entity: "acoes" });
    expect(rollupPercent(acoes, "metaId", meta.id, "completo")).toBe(0.5);

    await caller.planner.delete({ entity: "metas", id: meta.id });
    const depois = await caller.planner.list({ entity: "acoes" });
    expect(depois.find((a) => a.id === a1.id)?.metaId).toBeNull();
  });

  it("relação não pode apontar para registro de outra pessoa", async () => {
    const dono = appRouter.createCaller(createAuthContext(2106));
    const intruso = appRouter.createCaller(createAuthContext(2107));
    const projeto = await dono.planner.create({ entity: "projetos", data: { name: "Curso CGE" } });
    await expect(
      intruso.planner.create({ entity: "tarefasProjeto", data: { name: "x", projetoId: projeto.id } })
    ).rejects.toThrow(/não encontrado/);
  });

  it("isolamento: ninguém edita, apaga ou vê registro alheio", async () => {
    const dono = appRouter.createCaller(createAuthContext(2108));
    const intruso = appRouter.createCaller(createAuthContext(2109));
    const nota = await dono.planner.create({ entity: "notas", data: { name: "Ideia de aula" } });
    await expect(
      intruso.planner.update({ entity: "notas", id: nota.id, data: { name: "hack" } })
    ).rejects.toThrow(/não encontrado/);
    await expect(intruso.planner.delete({ entity: "notas", id: nota.id })).rejects.toThrow(/não encontrado/);
    expect(await intruso.planner.list({ entity: "notas" })).toHaveLength(0);
  });

  it("Reservatório de Dopamina vem com itens iniciais uma única vez", async () => {
    const caller = appRouter.createCaller(createAuthContext(2110));
    const itens = await caller.planner.list({ entity: "dopamina" });
    expect(itens.length).toBeGreaterThan(0);
    for (const i of itens) await caller.planner.delete({ entity: "dopamina", id: i.id });
    expect(await caller.planner.list({ entity: "dopamina" })).toHaveLength(0);
  });

  it("Lembrete com alarme futuro só aparece nas notificações na hora", async () => {
    const caller = appRouter.createCaller(createAuthContext(2111));
    const futuro = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const passado = new Date(Date.now() - 60 * 1000).toISOString();
    const l = await caller.planner.create({
      entity: "lembretes",
      data: { name: "Pagar boleto", alarme: futuro, categoria: "Casa" },
    });
    let notifs = await caller.notifications.getNotifications();
    expect(notifs.some((n: any) => n.title === "⏰ Pagar boleto")).toBe(false);

    await caller.planner.update({ entity: "lembretes", id: l.id, data: { alarme: passado } });
    notifs = await caller.notifications.getNotifications();
    expect(notifs.filter((n: any) => n.title === "⏰ Pagar boleto")).toHaveLength(1);

    await caller.planner.delete({ entity: "lembretes", id: l.id });
    notifs = await caller.notifications.getNotifications();
    expect(notifs.some((n: any) => n.title === "⏰ Pagar boleto")).toBe(false);
  });

  it("anexo de Estudos Gerais: lista sem conteúdo, baixa sob demanda", async () => {
    const caller = appRouter.createCaller(createAuthContext(2112));
    const dados = Buffer.from("resumo da aula").toString("base64");
    const e = await caller.planner.create({
      entity: "estudos",
      data: { name: "Podcast juros", tipo: "Podcast", anexo: { nome: "resumo.txt", tipo: "text/plain", dados } },
    });
    expect(e.anexo).toEqual({ nome: "resumo.txt", tipo: "text/plain" });
    const arquivo = await caller.planner.file({ id: e.id });
    expect(Buffer.from(arquivo.dados, "base64").toString()).toBe("resumo da aula");
  });

  it("configuração do contador é por pessoa", async () => {
    const a = appRouter.createCaller(createAuthContext(2113));
    const b = appRouter.createCaller(createAuthContext(2114));
    await a.planner.setSetting({ key: "contador", value: JSON.stringify({ titulo: "Prova CFP", alvo: "2026-12-01" }) });
    expect((await a.planner.getSetting({ key: "contador" })).value).toContain("Prova CFP");
    expect((await b.planner.getSetting({ key: "contador" })).value).toBeNull();
  });
});

describe("datas locais", () => {
  it("toISODate e addDays atravessam virada de mês", () => {
    expect(toISODate(new Date(2026, 0, 31, 12))).toBe("2026-01-31");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
});
