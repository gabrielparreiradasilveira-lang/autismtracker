import PlannerLayout from "@/components/planner/PlannerLayout";
import { formatarInstante } from "@/components/planner/format";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import { Bloco, CalendarView, RecordList, RecordTable, useEditor, ViewTabs } from "@/components/planner/views";
import { CONTEXTOS_TAREFA, addDays, PRIORIDADES, filtrarTarefas, type PlannerRow } from "@shared/planner";
import { useState } from "react";

const PROPS = ["data", "prioridade", "contexto"];

/** Área "Planner" — a base Tarefas em todas as visualizações do original. */
export default function PlannerTarefas() {
  const hoje = useHoje();
  const { rows: todas } = useEntity("tarefas");
  const ed = useEditor("tarefas");
  const [contexto, setContexto] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("");
  const [visaoGeral, setVisaoGeral] = useState<"tabela" | "completo">("tabela");

  // Filtros rápidos (Contexto/Prioridade) valem para todas as visões da página.
  const rows = todas.filter(
    (t) =>
      (!contexto || ((t.contexto as string[]) ?? []).includes(contexto)) &&
      (!prioridade || t.prioridade === prioridade)
  );
  const v = (visao: Parameters<typeof filtrarTarefas>[1]) => filtrarTarefas(rows, visao, hoje);
  const marcadorFeito = (r: PlannerRow) => (r.feito ? "✅ " : "");

  const lista = (itens: PlannerRow[], defaults: Record<string, unknown>, vazio: string) => (
    <RecordList
      entity="tarefas"
      rows={itens}
      doneField="feito"
      props={PROPS}
      onOpen={ed.abrir}
      onNew={() => ed.novo(defaults)}
      vazio={vazio}
    />
  );

  return (
    <PlannerLayout titulo="✅ Planner">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Filtrar:</span>
        <select
          aria-label="Filtrar por contexto"
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          className="h-9 rounded-md border border-input bg-white px-2"
        >
          <option value="">Todos os contextos</option>
          {CONTEXTOS_TAREFA.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar por prioridade"
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value)}
          className="h-9 rounded-md border border-input bg-white px-2"
        >
          <option value="">Todas as prioridades</option>
          {PRIORIDADES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <Bloco titulo="📥 Inbox (surgiu hoje)">
        {lista(v("inbox"), {}, "Nada novo hoje. Anote aqui o que aparecer no meio do dia.")}
      </Bloco>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Hoje">{lista(v("hoje"), { data: hoje }, "Dia livre. 🎈")}</Bloco>
        <div className="space-y-4">
          <Bloco titulo="⚠️ Atrasado">{lista(v("atrasado"), {}, "Nada atrasado. 👏")}</Bloco>
          <Bloco titulo="Amanhã">
            {lista(v("amanha"), { data: addDays(hoje, 1) }, "Nada para amanhã ainda.")}
          </Bloco>
          <Bloco titulo="Próxima Semana">{lista(v("proximaSemana"), {}, "Semana que vem está livre.")}</Bloco>
        </div>
      </div>

      <Bloco titulo="Essa Semana">
        <CalendarView
          entity="tarefas"
          rows={v("essaSemana")}
          dateField="data"
          hoje={hoje}
          modo="semana"
          onOpen={ed.abrir}
          onNew={ed.novo}
        />
      </Bloco>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Bloco titulo="Sem Data Prévia">{lista(v("semData"), {}, "Toda tarefa tem data. 🙌")}</Bloco>
        <Bloco titulo="Calendário">
          <CalendarView
            entity="tarefas"
            rows={rows}
            dateField="data"
            hoje={hoje}
            onOpen={ed.abrir}
            onNew={ed.novo}
            marcador={marcadorFeito}
          />
        </Bloco>
      </div>

      <Bloco titulo="Visualização Geral">
        <ViewTabs
          views={[
            { id: "tabela", label: "Tarefas Geral", count: rows.length },
            { id: "completo", label: "Completo", count: v("completo").length },
          ]}
          value={visaoGeral}
          onChange={setVisaoGeral}
        />
        <RecordTable
          entity="tarefas"
          rows={visaoGeral === "tabela" ? rows : v("completo")}
          columns={["name", "data", "contexto", "prioridade", "feito"]}
          extras={[{ label: "Quando foi criada", render: (r) => formatarInstante(r.createdAt) }]}
          onOpen={ed.abrir}
          onNew={() => ed.novo()}
          agregar
        />
      </Bloco>

      {ed.dialog}
    </PlannerLayout>
  );
}

