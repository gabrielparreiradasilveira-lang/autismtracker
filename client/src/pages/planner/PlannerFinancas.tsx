import PlannerLayout from "@/components/planner/PlannerLayout";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import { Bloco, RecordTable, useEditor, ViewTabs } from "@/components/planner/views";
import { cn } from "@/lib/utils";
import { MESES, formatarReais, somaValores, toISODate, type PlannerRow } from "@shared/planner";
import { useState } from "react";

type Mes = (typeof MESES)[number];

/** Área "Finanças" — Entradas e Saídas lado a lado, uma aba por mês. */
export default function PlannerFinancas() {
  const hoje = useHoje();
  const entradas = useEntity("entradas");
  const saidas = useEntity("saidas");
  const edEntrada = useEditor("entradas");
  const edSaida = useEditor("saidas");
  const [ano, setAno] = useState(Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState<Mes>(MESES[Number(hoje.slice(5, 7)) - 1]);

  const doMes = (rows: PlannerRow[]) =>
    rows
      .filter((r) => r.mes === mes && String(r.data ?? "").startsWith(String(ano)))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)));
  const e = doMes(entradas.rows);
  const s = doMes(saidas.rows);
  const totalE = somaValores(e);
  const totalS = somaValores(s);
  const saldo = Math.round((totalE - totalS) * 100) / 100;

  // Uma linha nova já nasce com uma data dentro do mês/ano da aba aberta.
  const dataPadrao = () => {
    const m = MESES.indexOf(mes);
    const atual = Number(hoje.slice(0, 4)) === ano && Number(hoje.slice(5, 7)) - 1 === m;
    return atual ? hoje : toISODate(new Date(ano, m, 1, 12));
  };

  const anos = Array.from(
    new Set([ano, Number(hoje.slice(0, 4)), ...[...entradas.rows, ...saidas.rows].map((r) => Number(String(r.data).slice(0, 4)))])
  )
    .filter(Boolean)
    .sort();

  return (
    <PlannerLayout titulo="💵 Finanças">
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Ano"
          value={ano}
          onChange={(ev) => setAno(Number(ev.target.value))}
          className="h-9 rounded-md border border-input bg-white px-2 text-sm"
        >
          {anos.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
      <ViewTabs views={MESES.map((m) => ({ id: m, label: m }))} value={mes} onChange={setMes} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Resumo titulo="Entradas" valor={totalE} cor="text-green-700" />
        <Resumo titulo="Saídas" valor={totalS} cor="text-red-700" />
        <Resumo titulo="Saldo do mês" valor={saldo} cor={saldo >= 0 ? "text-gray-900" : "text-red-700"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="⬆️ Entradas">
          <RecordTable
            entity="entradas"
            rows={e}
            columns={["name", "valor", "categoria", "data", "mes"]}
            onOpen={edEntrada.abrir}
            onNew={() => edEntrada.novo({ data: dataPadrao() })}
            agregar
          />
        </Bloco>
        <Bloco titulo="⬇️ Saídas">
          <RecordTable
            entity="saidas"
            rows={s}
            columns={["name", "valor", "categoria", "data", "mes"]}
            onOpen={edSaida.abrir}
            onNew={() => edSaida.novo({ data: dataPadrao() })}
            agregar
          />
        </Bloco>
      </div>

      {edEntrada.dialog}
      {edSaida.dialog}
    </PlannerLayout>
  );
}

function Resumo({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-500">{titulo}</div>
      <div className={cn("text-xl font-bold tabular-nums", cor)}>{formatarReais(valor)}</div>
    </div>
  );
}
