import PlannerLayout from "@/components/planner/PlannerLayout";
import { formatarDia } from "@/components/planner/format";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import { BarraProgresso, Bloco, CalendarView, RecordTable, useEditor, ViewTabs, type ColunaExtra } from "@/components/planner/views";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  DIAS_SEMANA,
  HABITOS,
  addDays,
  diasDaSemana,
  inicioDaSemana,
  mesDaData,
  percentMarcado,
  progressoHabitos,
  type PlannerRow,
} from "@shared/planner";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Visao = "dia" | "semana" | "mes" | "calendario";
const COLUNAS = ["data", "name", ...HABITOS.map((h) => h.key), "status"];

const progresso: ColunaExtra = {
  label: "Progresso",
  render: (r) => <BarraProgresso valor={progressoHabitos(r)} />,
  agregado: (rows) =>
    rows.length ? <BarraProgresso valor={rows.reduce((a, r) => a + progressoHabitos(r), 0) / rows.length} /> : null,
};

/** Agrupa as linhas por uma chave, mais recente primeiro (como os grupos do Notion). */
function agrupar(rows: PlannerRow[], chave: (data: string) => string) {
  const m = new Map<string, PlannerRow[]>();
  for (const r of [...rows].sort((a, b) => String(a.data ?? "").localeCompare(String(b.data ?? "")))) {
    const k = r.data ? chave(r.data as string) : "Sem data";
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Área "Rotina/Hábitos" — o Tracker com o botão Nova Semana. */
export default function PlannerHabitos() {
  const hoje = useHoje();
  const { rows } = useEntity("habitos");
  const ed = useEditor("habitos");
  const [visao, setVisao] = useState<Visao>("dia");
  const utils = trpc.useUtils();
  const novaSemana = trpc.planner.novaSemana.useMutation({
    onSuccess: (r) => {
      utils.planner.list.invalidate();
      toast.success(r.criados ? `Semana criada: ${r.criados} dias novos.` : "Essa semana já estava criada.");
    },
    onError: (e) => toast.error(e.message),
  });

  const semana = diasDaSemana(hoje);
  const tabela = (itens: PlannerRow[]) => (
    <RecordTable entity="habitos" rows={itens} columns={COLUNAS} extras={[progresso]} onOpen={ed.abrir} agregar />
  );

  return (
    <PlannerLayout titulo="⚡ Rotina/Hábitos">
      <Bloco>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => novaSemana.mutate({ hoje })} disabled={novaSemana.isPending}>
            <CalendarPlus /> Nova Semana
          </Button>
          <span className="text-sm text-gray-500">Cria Segunda → Domingo desta semana no Tracker (não duplica).</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {DIAS_SEMANA.map((nome, i) => {
            const data = semana[i];
            const linha = rows.find((r) => r.data === data);
            return (
              <button
                key={nome}
                type="button"
                onClick={() => (linha ? ed.abrir(linha) : ed.novo({ name: nome, data }))}
                className={cn(
                  "rounded-lg border p-2 text-left text-sm hover:shadow-sm",
                  data === hoje ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white"
                )}
              >
                <span className="block font-medium">📄 {nome}</span>
                <span className="block text-xs text-gray-500">{formatarDia(data)}</span>
                {linha ? <BarraProgresso valor={progressoHabitos(linha)} /> : <span className="text-xs text-gray-400">sem linha</span>}
              </button>
            );
          })}
        </div>
      </Bloco>

      <Bloco titulo="Tracker Rotina/Hábitos">
        <ViewTabs
          views={[
            { id: "dia", label: "Dia" },
            { id: "semana", label: "Semana" },
            { id: "mes", label: "Mês" },
            { id: "calendario", label: "Calendário" },
          ]}
          value={visao}
          onChange={setVisao}
        />

        {visao === "dia" && (
          <>
            {tabela(rows.filter((r) => r.data === hoje))}
            {!rows.some((r) => r.data === hoje) && (
              <Button variant="outline" size="sm" onClick={() => ed.novo({ name: DIAS_SEMANA[semana.indexOf(hoje)], data: hoje })}>
                Criar o dia de hoje
              </Button>
            )}
          </>
        )}

        {visao === "semana" &&
          agrupar(rows, inicioDaSemana).map(([seg, itens]) => (
            <div key={seg} className="mb-6">
              <h4 className="mb-1 text-sm font-semibold text-gray-700">
                {seg === "Sem data" ? seg : `Semana ${formatarDia(seg)} – ${formatarDia(addDays(seg, 6))}`}
              </h4>
              <ResumoHabitos itens={itens} />
              {tabela(itens)}
            </div>
          ))}

        {visao === "mes" &&
          agrupar(rows, (d) => d.slice(0, 7)).map(([mes, itens]) => (
            <div key={mes} className="mb-6">
              <h4 className="mb-1 text-sm font-semibold text-gray-700">
                {mes === "Sem data" ? mes : `${mesDaData(`${mes}-01`)} ${mes.slice(0, 4)}`}
              </h4>
              <ResumoHabitos itens={itens} />
              {tabela(itens)}
            </div>
          ))}

        {(visao === "semana" || visao === "mes") && rows.length === 0 && (
          <p className="text-sm text-gray-500">Aperte “Nova Semana” para começar.</p>
        )}

        {visao === "calendario" && (
          <CalendarView
            entity="habitos"
            rows={rows}
            dateField="data"
            hoje={hoje}
            onOpen={ed.abrir}
            onNew={(d) => ed.novo({ ...d, name: DIAS_SEMANA[(new Date(`${d.data}T12:00`).getDay() + 6) % 7] })}
            marcador={(r) => `${Math.round(progressoHabitos(r) * 100)}% `}
          />
        )}
      </Bloco>

      {ed.dialog}
    </PlannerLayout>
  );
}

/** % marcado de cada hábito no grupo — as agregações do rodapé, em destaque visual. */
function ResumoHabitos({ itens }: { itens: PlannerRow[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {HABITOS.map((h) => (
        <span key={h.key} className="rounded-full bg-gray-100 px-2 py-1 text-xs">
          {h.emoji} {h.label}: <b>{Math.round(percentMarcado(itens, h.key) * 100)}%</b>
        </span>
      ))}
    </div>
  );
}
