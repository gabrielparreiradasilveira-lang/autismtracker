import PlannerLayout from "@/components/planner/PlannerLayout";
import { useEntity } from "@/components/planner/usePlanner";
import { BarraProgresso, Board, Bloco, RecordTable, useEditor, useNomes, ViewTabs } from "@/components/planner/views";
import { ANOS_META, rollupPercent, type PlannerRow } from "@shared/planner";
import { useState } from "react";

/** Área "Metas" — Metas em quadro + Ações p/alcançar a meta. */
export default function PlannerMetas() {
  const metas = useEntity("metas");
  const acoes = useEntity("acoes");
  const edMeta = useEditor("metas");
  const edAcao = useEditor("acoes");
  const nomesMetas = useNomes("metas");
  const anoAtual = String(new Date().getFullYear());
  const [ano, setAno] = useState<string>(ANOS_META.includes(anoAtual as never) ? anoAtual : "todos");
  const [visaoAcoes, setVisaoAcoes] = useState<"pendentes" | "todas">("pendentes");

  const progresso = (r: PlannerRow) => rollupPercent(acoes.rows, "metaId", r.id, "completo");
  const visiveis = metas.rows.filter((m) => ano === "todos" || m.ano === ano || !m.ano);
  const listaAcoes = visaoAcoes === "pendentes" ? acoes.rows.filter((a) => !a.completo) : acoes.rows;

  return (
    <PlannerLayout titulo="🎯 Metas">
      <Bloco
        titulo="Metas"
        acao={
          <select
            aria-label="Ano"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="h-9 rounded-md border border-input bg-white px-2 text-sm"
          >
            <option value="todos">Todos os anos</option>
            {ANOS_META.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        }
      >
        <Board
          entity="metas"
          rows={visiveis}
          groupBy="prazo"
          props={["ano", "contexto", "deadline"]}
          onOpen={edMeta.abrir}
          onNew={(d) => edMeta.novo({ ...d, ano: ano === "todos" ? anoAtual : ano })}
          extra={(r) => (
            <span className="flex items-center gap-2">
              {r.alcancado ? <span className="text-green-700">🏆 Alcançado</span> : null}
              <BarraProgresso valor={progresso(r)} />
            </span>
          )}
        />
      </Bloco>

      <Bloco titulo="Ações para alcançar a meta">
        <ViewTabs
          views={[
            { id: "pendentes", label: "A fazer", count: acoes.rows.filter((a) => !a.completo).length },
            { id: "todas", label: "Todas", count: acoes.rows.length },
          ]}
          value={visaoAcoes}
          onChange={setVisaoAcoes}
        />
        <RecordTable
          entity="acoes"
          rows={listaAcoes}
          columns={["name", "metaId", "deadline", "completo"]}
          nomes={nomesMetas}
          onOpen={edAcao.abrir}
          onNew={() => edAcao.novo()}
          agregar
        />
      </Bloco>

      {edMeta.dialog}
      {edAcao.dialog}
    </PlannerLayout>
  );
}
