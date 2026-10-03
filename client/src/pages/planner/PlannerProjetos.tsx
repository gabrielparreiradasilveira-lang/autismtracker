import PlannerLayout from "@/components/planner/PlannerLayout";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import {
  BarraProgresso,
  Board,
  Bloco,
  CalendarView,
  Gallery,
  RecordList,
  useEditor,
  useNomes,
  ViewTabs,
} from "@/components/planner/views";
import { filtrarTarefasProjeto, rollupPercent, type PlannerRow } from "@shared/planner";
import { useState } from "react";

/** Área "Projetos" — Projetos (quadro/galeria) + Tarefas do projeto. */
export default function PlannerProjetos() {
  const hoje = useHoje();
  const projetos = useEntity("projetos");
  const tarefas = useEntity("tarefasProjeto");
  const edProjeto = useEditor("projetos");
  const edTarefa = useEditor("tarefasProjeto");
  const nomes = useNomes("projetos");
  const [visao, setVisao] = useState<"quadro" | "galeria">("quadro");
  const [visaoTarefas, setVisaoTarefas] = useState<"hoje" | "proximas">("hoje");

  const progresso = (r: PlannerRow) => <BarraProgresso valor={rollupPercent(tarefas.rows, "projetoId", r.id, "completo")} />;
  const extra = (r: PlannerRow) => (
    <span className="flex flex-col gap-1">
      <span className="text-gray-500">
        {tarefas.rows.filter((t) => t.projetoId === r.id).length} tarefas
      </span>
      {progresso(r)}
    </span>
  );

  return (
    <PlannerLayout titulo="💡 Projetos">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Bloco titulo="Projetos">
          <ViewTabs
            views={[
              { id: "quadro", label: "Quadro" },
              { id: "galeria", label: "Galeria" },
            ]}
            value={visao}
            onChange={setVisao}
          />
          {visao === "quadro" ? (
            <Board
              entity="projetos"
              rows={projetos.rows}
              groupBy="status"
              props={["inicio", "fim"]}
              onOpen={edProjeto.abrir}
              onNew={edProjeto.novo}
              extra={extra}
            />
          ) : (
            <Gallery
              entity="projetos"
              rows={projetos.rows}
              props={["status", "inicio", "fim"]}
              onOpen={edProjeto.abrir}
              onNew={() => edProjeto.novo()}
              extra={extra}
            />
          )}
        </Bloco>

        <Bloco titulo="Tarefas">
          <ViewTabs
            views={[
              { id: "hoje", label: "Hoje", count: filtrarTarefasProjeto(tarefas.rows, "hoje", hoje).length },
              { id: "proximas", label: "Próximas", count: filtrarTarefasProjeto(tarefas.rows, "proximas", hoje).length },
            ]}
            value={visaoTarefas}
            onChange={setVisaoTarefas}
          />
          <RecordList
            entity="tarefasProjeto"
            rows={filtrarTarefasProjeto(tarefas.rows, visaoTarefas, hoje).sort((a, b) =>
              String(a.quando).localeCompare(String(b.quando))
            )}
            doneField="completo"
            props={["projetoId", "quando"]}
            nomes={nomes}
            onOpen={edTarefa.abrir}
            onNew={() => edTarefa.novo(visaoTarefas === "hoje" ? { quando: hoje } : {})}
            vazio={visaoTarefas === "hoje" ? "Nada para hoje nos projetos." : "Nenhuma tarefa futura."}
          />
        </Bloco>
      </div>

      <Bloco titulo="Sem data">
        <RecordList
          entity="tarefasProjeto"
          rows={filtrarTarefasProjeto(tarefas.rows, "semData", hoje)}
          doneField="completo"
          props={["projetoId"]}
          nomes={nomes}
          onOpen={edTarefa.abrir}
          onNew={() => edTarefa.novo()}
          vazio="Toda tarefa de projeto tem data."
        />
      </Bloco>

      <Bloco titulo="Calendário">
        <CalendarView
          entity="tarefasProjeto"
          rows={tarefas.rows}
          dateField="quando"
          hoje={hoje}
          onOpen={edTarefa.abrir}
          onNew={edTarefa.novo}
          marcador={(r) => (r.completo ? "✅ " : "")}
        />
      </Bloco>

      {edProjeto.dialog}
      {edTarefa.dialog}
    </PlannerLayout>
  );
}
