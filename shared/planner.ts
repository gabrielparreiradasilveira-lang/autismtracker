/**
 * "Voe Alto. Seja leve." — o planner do Notion, reproduzido dentro do app.
 *
 * Este arquivo é a fonte única das bases: cada entidade declara seus campos
 * do jeito que o template original declara as propriedades (nome, tipo,
 * opções). O servidor monta a validação e o SQL a partir daqui; o cliente
 * monta formulários, tabelas, quadros e calendários a partir daqui. Assim
 * uma propriedade nova aparece nos dois lados de uma vez.
 *
 * As fórmulas e os filtros das visualizações também moram aqui, para que a
 * tela e os testes calculem exatamente a mesma coisa.
 */

export type FieldType =
  | "text" // texto curto
  | "longtext" // texto longo (notas)
  | "date" // dia, "YYYY-MM-DD"
  | "datetime" // instante, ISO-8601
  | "bool" // checkbox
  | "int" // número inteiro
  | "money" // valor em reais (guardado em centavos)
  | "select" // uma opção
  | "multi" // várias opções
  | "rating" // estrelas 1–5
  | "url"
  | "file" // anexo pequeno
  | "relation"; // id de outra entidade do mesmo usuário

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  /** Para relation: a entidade apontada. */
  target?: string;
  required?: boolean;
  /** Campo calculado pelo servidor — não aparece no formulário. */
  derived?: boolean;
};

export type EntitySpec = {
  key: string;
  /** Nome da base no template original. */
  label: string;
  table: string;
  fields: readonly FieldSpec[];
};

export const CONTEXTOS_TAREFA = [
  "Projetos", "Metas", "Lazer", "Leitura", "Exercício", "Estudo", "Trabalho", "Casa",
] as const;
export const PRIORIDADES = ["Sem pressa", "Importante", "Urgente"] as const;

/** Os seis hábitos do Tracker, na ordem das colunas do original. */
export const HABITOS = [
  { key: "acordarCedo", label: "Acordar cedo", emoji: "⏰" },
  { key: "leitura", label: "Leitura", emoji: "📖" },
  { key: "treino", label: "Treino", emoji: "🏋️" },
  { key: "alimentacao", label: "Alimentação", emoji: "🥗" },
  { key: "estudo", label: "Estudo", emoji: "🧠" },
  { key: "agua", label: "Água", emoji: "💧" },
] as const;
export type HabitoKey = (typeof HABITOS)[number]["key"];

/** Os anos do original eram 2023/2024; atualizados para o horizonte atual. */
export const ANOS_META = ["2025", "2026", "2027"] as const;
export const PRAZOS_META = ["Curto Prazo", "Médio Prazo", "Longo Prazo"] as const;
export const CONTEXTOS_META = [
  "Estudo", "Leitura", "Saúde", "Lazer", "Finanças", "Trabalho", "Casa",
] as const;

export const STATUS_LEITURA = ["Não iniciado", "Lendo", "Concluído"] as const;
export const CATEGORIAS_LEITURA = [
  "Ficção", "Romance", "Literatura Clássica", "Performance", "Negócios",
  "Psicologia", "Finanças", "Outros",
] as const;
export const STATUS_CURSO = ["Não começado", "Em progresso", "Concluído"] as const;
export const AREAS_CURSO = [
  "Saúde", "Marketing Digital", "Tecnologia", "Desenvolvimento Pessoal", "Negócios",
] as const;
export const AREAS_ESTUDO = [
  "Psicologia", "Alimentação", "Atividade Física", "Performance", "Saúde",
] as const;
export const TIPOS_ESTUDO = ["Mentoria", "Podcast", "Vídeo"] as const;

export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const;
export const CATEGORIAS_ENTRADA = [
  "Salário", "Fixo", "Freelancer", "Venda", "Renda Extra",
] as const;
export const CATEGORIAS_SAIDA = [
  "Aluguel/Financiamento", "Despesas Fixas", "Alimentação", "Ifood", "Restaurante",
  "Compras", "Assinaturas", "Academia", "Saúde", "Escola",
] as const;

export const STATUS_PROJETO = ["Não iniciado", "Em progresso", "Feito"] as const;
export const CATEGORIAS_LEMBRETE = ["Casa", "Trabalho"] as const;
export const NIVEIS_DOPAMINA = ["Aperitivo", "Prato principal", "Sobremesa"] as const;
export const STATUS_DIA = ["Leve", "Ok", "Pesado"] as const;

/** Tamanho máximo de um anexo de Estudos Gerais, em bytes do arquivo original. */
export const MAX_ANEXO_BYTES = 5 * 1024 * 1024;

export const ENTITIES = {
  tarefas: {
    key: "tarefas",
    label: "Tarefas",
    table: "planner_tasks",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "data", label: "Data", type: "date" },
      { key: "contexto", label: "Contexto", type: "multi", options: CONTEXTOS_TAREFA },
      { key: "prioridade", label: "Prioridade", type: "select", options: PRIORIDADES },
      { key: "feito", label: "Feito", type: "bool" },
    ],
  },
  habitos: {
    key: "habitos",
    label: "Tracker Rotina/Hábitos",
    table: "habit_days",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "data", label: "Data", type: "date" },
      ...HABITOS.map((h) => ({ key: h.key, label: h.label, type: "bool" as const })),
      { key: "status", label: "Status", type: "select", options: STATUS_DIA },
    ],
  },
  metas: {
    key: "metas",
    label: "Metas",
    table: "goals",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "ano", label: "Ano", type: "select", options: ANOS_META },
      { key: "prazo", label: "Prazo", type: "select", options: PRAZOS_META },
      { key: "contexto", label: "Contexto", type: "select", options: CONTEXTOS_META },
      { key: "deadline", label: "Deadline", type: "date" },
      { key: "alcancado", label: "Alcançado", type: "bool" },
    ],
  },
  acoes: {
    key: "acoes",
    label: "Ações p/alcançar a meta",
    table: "goal_actions",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "metaId", label: "Meta", type: "relation", target: "metas" },
      { key: "deadline", label: "Deadline", type: "date" },
      { key: "completo", label: "Completo", type: "bool" },
    ],
  },
  livros: {
    key: "livros",
    label: "Leitura",
    table: "books",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "autor", label: "Autor", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS_LEITURA },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_LEITURA },
      { key: "classificacao", label: "Classificação", type: "rating" },
      { key: "totalPaginas", label: "Total de Páginas", type: "int" },
      { key: "paginasLidas", label: "Páginas lidas", type: "int" },
      { key: "terminado", label: "Terminado", type: "date" },
    ],
  },
  cursos: {
    key: "cursos",
    label: "Cursos",
    table: "courses",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "area", label: "Área", type: "select", options: AREAS_CURSO },
      { key: "status", label: "Status", type: "select", options: STATUS_CURSO },
      { key: "aulasAssistidas", label: "Aulas Assistidas", type: "int" },
      { key: "aulasTotais", label: "Aulas Totais", type: "int" },
      { key: "classificacao", label: "Classificação", type: "rating" },
      { key: "concluidoEm", label: "Concluído em", type: "date" },
    ],
  },
  estudos: {
    key: "estudos",
    label: "Estudos Gerais",
    table: "study_items",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "area", label: "Área", type: "select", options: AREAS_ESTUDO },
      { key: "tipo", label: "Tipo", type: "select", options: TIPOS_ESTUDO },
      { key: "visto", label: "Visto", type: "date" },
      { key: "url", label: "URL", type: "url" },
      { key: "anexo", label: "Anexos", type: "file" },
    ],
  },
  entradas: {
    key: "entradas",
    label: "Entradas",
    table: "finance_in",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "valor", label: "Valor", type: "money", required: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_ENTRADA },
      { key: "data", label: "Data", type: "date", required: true },
      { key: "mes", label: "Mês", type: "select", options: MESES, derived: true },
    ],
  },
  saidas: {
    key: "saidas",
    label: "Saídas",
    table: "finance_out",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "valor", label: "Valor", type: "money", required: true },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_SAIDA },
      { key: "data", label: "Data", type: "date", required: true },
      { key: "mes", label: "Mês", type: "select", options: MESES, derived: true },
    ],
  },
  projetos: {
    key: "projetos",
    label: "Projetos",
    table: "projects",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_PROJETO },
      { key: "inicio", label: "Data de Início", type: "date" },
      { key: "fim", label: "Data de Fim", type: "date" },
    ],
  },
  tarefasProjeto: {
    key: "tarefasProjeto",
    label: "Tarefas do Projeto",
    table: "project_tasks",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "projetoId", label: "Projeto", type: "relation", target: "projetos" },
      { key: "quando", label: "Quando", type: "date" },
      { key: "completo", label: "Completo", type: "bool" },
    ],
  },
  notas: {
    key: "notas",
    label: "Notas e Ideias",
    table: "planner_notes",
    fields: [
      { key: "name", label: "Título", type: "text", required: true },
      { key: "conteudo", label: "Conteúdo", type: "longtext" },
    ],
  },
  lembretes: {
    key: "lembretes",
    label: "Lembretes",
    table: "planner_reminders",
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "alarme", label: "Alarme", type: "datetime" },
      { key: "categoria", label: "Categoria", type: "select", options: CATEGORIAS_LEMBRETE },
    ],
  },
  dopamina: {
    key: "dopamina",
    label: "Reservatório de Dopamina",
    table: "dopamine_items",
    fields: [
      { key: "name", label: "Recompensa", type: "text", required: true },
      { key: "nivel", label: "Nível", type: "select", options: NIVEIS_DOPAMINA, required: true },
      { key: "descricao", label: "Como usar", type: "text" },
    ],
  },
} as const satisfies Record<string, EntitySpec>;

export type EntityKey = keyof typeof ENTITIES;
export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export function getEntity(key: EntityKey): EntitySpec {
  return ENTITIES[key] as unknown as EntitySpec;
}

/**
 * Uma linha de qualquer base, como o servidor devolve.
 * `money` chega em reais; `multi` como array; `bool` como boolean;
 * `file` só com o nome (o conteúdo vem de `planner.file`).
 */
export type PlannerRow = {
  id: number;
  createdAt: string;
  updatedAt: string;
  [field: string]: unknown;
};

// ===== Datas (sempre no dia local de quem usa) =====

/** "YYYY-MM-DD" de uma data, no fuso local. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Converte "YYYY-MM-DD" em Date ao meio-dia local (imune a horário de verão). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export const DIAS_SEMANA = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
] as const;

/** Segunda-feira da semana de `iso` (semana de segunda a domingo). */
export function inicioDaSemana(iso: string): string {
  const d = parseISODate(iso);
  const diaJs = d.getDay(); // 0 = domingo
  const desdeSegunda = (diaJs + 6) % 7;
  return addDays(iso, -desdeSegunda);
}

/** As sete datas da semana de `iso`, de segunda a domingo. */
export function diasDaSemana(iso: string): string[] {
  const seg = inicioDaSemana(iso);
  return DIAS_SEMANA.map((_, i) => addDays(seg, i));
}

/** Nome do mês ("Março") de uma data "YYYY-MM-DD". */
export function mesDaData(iso: string): (typeof MESES)[number] {
  return MESES[Number(iso.slice(5, 7)) - 1];
}

/** Dia local (YYYY-MM-DD) de um instante ISO. */
export function diaLocal(isoInstant: string): string {
  return toISODate(new Date(isoInstant));
}

// ===== Fórmulas do original =====

/**
 * Progresso do Tracker — idêntico ao Notion:
 * floor(1000 · (soma dos 6 checkboxes) / 6) / 1000.
 */
export function progressoHabitos(row: Record<string, unknown>): number {
  const soma = HABITOS.reduce((acc, h) => acc + (row[h.key] ? 1 : 0), 0);
  return Math.floor((1000 * soma) / 6) / 1000;
}

/** round(parte / total · 100) / 100, ou null quando o total não existe. */
function razao(parte: unknown, total: unknown): number | null {
  const p = Number(parte ?? 0);
  const t = Number(total ?? 0);
  if (!t || t <= 0) return null;
  return Math.round((p / t) * 100) / 100;
}

/** Leitura: Páginas lidas ÷ Total de Páginas. */
export function progressoLivro(row: Record<string, unknown>): number | null {
  return razao(row.paginasLidas, row.totalPaginas);
}

/** Cursos: Aulas Assistidas ÷ Aulas Totais. */
export function progressoCurso(row: Record<string, unknown>): number | null {
  return razao(row.aulasAssistidas, row.aulasTotais);
}

/** Agregação "percent checked" do Notion: fração de linhas com o campo marcado. */
export function percentMarcado(rows: Record<string, unknown>[], campo: string): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => !!r[campo]).length / rows.length;
}

/**
 * Rollup "percent checked" através de uma relação: fração dos filhos
 * ligados a `paiId` que têm `campo` marcado. Sem filhos, 0.
 */
export function rollupPercent(
  filhos: Record<string, unknown>[],
  relacao: string,
  paiId: number,
  campo: string
): number {
  return percentMarcado(filhos.filter((f) => f[relacao] === paiId), campo);
}

// ===== Filtros das visualizações do Planner =====

export type VisaoTarefa =
  | "inbox"
  | "hoje"
  | "atrasado"
  | "amanha"
  | "proximaSemana"
  | "essaSemana"
  | "semData"
  | "completo"
  | "geral";

/**
 * Cada visualização da base Tarefas, com o filtro do original:
 * - Inbox (surgiu hoje): sem Data, não Feito, criada hoje
 * - Hoje / To-do Hoje: Data = hoje, não Feito
 * - Atrasado: Data < hoje, não Feito
 * - Amanhã: Data = amanhã, não Feito
 * - Próxima Semana: Data dentro da semana seguinte, não Feito
 * - Essa Semana: Data dentro desta semana, não Feito
 * - Sem Data Prévia: sem Data, não Feito
 * - Completo: Feito
 * - Visualização Geral: tudo
 */
export function filtrarTarefas<T extends Record<string, unknown>>(
  rows: T[],
  visao: VisaoTarefa,
  hoje: string
): T[] {
  const semana = diasDaSemana(hoje);
  const proxima = diasDaSemana(addDays(semana[0], 7));
  const amanha = addDays(hoje, 1);
  return rows.filter((r) => {
    const data = (r.data as string | null) ?? null;
    const feito = !!r.feito;
    switch (visao) {
      case "inbox":
        return !data && !feito && typeof r.createdAt === "string" && diaLocal(r.createdAt) === hoje;
      case "hoje":
        return data === hoje && !feito;
      case "atrasado":
        return !!data && data < hoje && !feito;
      case "amanha":
        return data === amanha && !feito;
      case "proximaSemana":
        return !!data && data >= proxima[0] && data <= proxima[6] && !feito;
      case "essaSemana":
        return !!data && data >= semana[0] && data <= semana[6] && !feito;
      case "semData":
        return !data && !feito;
      case "completo":
        return feito;
      case "geral":
        return true;
    }
  });
}

/** Visões da base Tarefas do Projeto (Hoje, Próximas, Sem data). */
export function filtrarTarefasProjeto<T extends Record<string, unknown>>(
  rows: T[],
  visao: "hoje" | "proximas" | "semData",
  hoje: string
): T[] {
  return rows.filter((r) => {
    const quando = (r.quando as string | null) ?? null;
    if (r.completo) return false;
    if (visao === "hoje") return quando === hoje;
    if (visao === "proximas") return !!quando && quando > hoje;
    return !quando;
  });
}

/** Status de leitura → grupo das três galerias (Lendo, A ler, Lido). */
export function grupoLeitura(status: unknown): "Lendo" | "A ler" | "Lido" {
  if (status === "Lendo") return "Lendo";
  if (status === "Concluído") return "Lido";
  return "A ler";
}

/** Soma dos valores (em reais) de um conjunto de lançamentos. */
export function somaValores(rows: Record<string, unknown>[]): number {
  const centavos = rows.reduce((acc, r) => acc + Math.round(Number(r.valor ?? 0) * 100), 0);
  return centavos / 100;
}

export function formatarReais(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarPercent(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v * 100)}%`;
}

/** Itens iniciais do Reservatório de Dopamina — editáveis pela pessoa. */
export const DOPAMINA_INICIAL: { name: string; nivel: (typeof NIVEIS_DOPAMINA)[number]; descricao: string }[] = [
  { name: "Ouvir 1 música favorita", nivel: "Aperitivo", descricao: "≤ 5 min. Fone, olhos fechados." },
  { name: "Alongar e beber água", nivel: "Aperitivo", descricao: "≤ 5 min. Corpo primeiro." },
  { name: "Café ou chá com calma", nivel: "Aperitivo", descricao: "≤ 5 min. Sem tela." },
  { name: "Caminhada curta ao ar livre", nivel: "Prato principal", descricao: "15–30 min. Luz natural." },
  { name: "Hobby manual (desenhar, montar, cozinhar)", nivel: "Prato principal", descricao: "30–60 min. Mãos ocupadas." },
  { name: "Ler um capítulo por prazer", nivel: "Prato principal", descricao: "20–40 min." },
  { name: "Série / vídeo", nivel: "Sobremesa", descricao: "Com hora para acabar. Timer ligado." },
  { name: "Redes sociais", nivel: "Sobremesa", descricao: "Só depois do dia fechado. Máx. 20 min." },
];

/** As seis Áreas da galeria do painel, na ordem do original. */
export const AREAS = [
  { slug: "tarefas", label: "Planner", emoji: "✅" },
  { slug: "habitos", label: "Rotina/Hábitos", emoji: "⚡" },
  { slug: "metas", label: "Metas", emoji: "🎯" },
  { slug: "estudos", label: "Estudos/Leitura", emoji: "📕" },
  { slug: "financas", label: "Finanças", emoji: "💵" },
  { slug: "projetos", label: "Projetos", emoji: "💡" },
] as const;

export const FRASE_PAINEL =
  "Que as suas atitudes falem tão alto que não consigam ouvir o que você diz.";

/**
 * Configurações por pessoa guardadas no servidor: o Contador de Estudos
 * (título + data-alvo, substitui o widget Indify) e as durações do Pomodoro.
 */
export const PLANNER_SETTINGS = ["contador", "pomodoro"] as const;
