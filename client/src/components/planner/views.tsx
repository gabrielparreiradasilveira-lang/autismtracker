import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DIAS_SEMANA,
  addDays,
  diasDaSemana,
  formatarPercent,
  formatarReais,
  getEntity,
  inicioDaSemana,
  parseISODate,
  percentMarcado,
  somaValores,
  toISODate,
  type EntityKey,
  type FieldSpec,
  type PlannerRow,
} from "@shared/planner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import RecordDialog from "./RecordDialog";
import { Valor, corDaOpcao, inicialMaiuscula } from "./format";
import { useEntity } from "./usePlanner";

/**
 * Estado do diálogo de uma base: abrir um item existente ou criar um
 * novo com valores iniciais. Cada tela chama uma vez por base e
 * renderiza `dialog` no fim.
 */
export function useEditor(entity: EntityKey, hide?: string[]) {
  const [estado, setEstado] = useState<{ open: boolean; row: PlannerRow | null; defaults?: Record<string, unknown> }>({
    open: false,
    row: null,
  });
  return {
    abrir: (row: PlannerRow) => setEstado({ open: true, row }),
    novo: (defaults?: Record<string, unknown>) => setEstado({ open: true, row: null, defaults }),
    dialog: (
      <RecordDialog
        entity={entity}
        open={estado.open}
        row={estado.row}
        defaults={estado.defaults}
        hide={hide}
        onOpenChange={(open) => setEstado((s) => ({ ...s, open }))}
      />
    ),
  };
}

/** Mapa id → nome dos registros de uma base (para mostrar relações). */
export function useNomes(entity: EntityKey) {
  const { rows } = useEntity(entity);
  return useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r.name as string])), [rows]);
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="px-2 py-3 text-sm text-gray-500">{children}</p>;
}

export function NovoBotao({ onClick, label = "Novo" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
    >
      <Plus className="h-4 w-4" /> {label}
    </button>
  );
}

/**
 * Visualização em lista, com o checkbox de "feito" à esquerda — o
 * formato dos blocos To-do Hoje, Atividades que surgiram hoje e Notas.
 */
export function RecordList({
  entity,
  rows,
  doneField,
  props = [],
  onOpen,
  onNew,
  vazio = "Nada por aqui.",
  nomes,
}: {
  entity: EntityKey;
  rows: PlannerRow[];
  doneField?: string;
  props?: string[];
  onOpen: (r: PlannerRow) => void;
  onNew?: () => void;
  vazio?: string;
  nomes?: Record<number, string>;
}) {
  const { update } = useEntity(entity);
  const spec = getEntity(entity);
  const campos = props.map((k) => spec.fields.find((f) => f.key === k)!).filter(Boolean);
  return (
    <div>
      {rows.length === 0 ? (
        <Vazio>{vazio}</Vazio>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2 px-1 py-2">
              {doneField && (
                <Checkbox
                  className="mt-0.5 h-5 w-5"
                  checked={!!r[doneField]}
                  aria-label={`Marcar "${r.name as string}"`}
                  onCheckedChange={(c) => update(r.id, { [doneField]: c === true })}
                />
              )}
              <button type="button" onClick={() => onOpen(r)} className="min-w-0 flex-1 text-left">
                <span className={cn("block text-sm", doneField && !!r[doneField] && "text-gray-400 line-through")}>
                  {r.name as string}
                </span>
                {campos.length > 0 && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {campos.map((f) => (
                      <Valor key={f.key} entity={entity} field={f} row={r} nomes={nomes} />
                    ))}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {onNew && <NovoBotao onClick={onNew} />}
    </div>
  );
}

export type ColunaExtra = { label: string; render: (r: PlannerRow) => React.ReactNode; agregado?: (rows: PlannerRow[]) => React.ReactNode };

/**
 * Visualização em tabela. Checkboxes alternam direto na célula; clicar
 * no resto da linha abre o item. O rodapé repete as agregações do
 * original: soma para dinheiro, % marcado para checkbox, contagem no nome.
 */
export function RecordTable({
  entity,
  rows,
  columns,
  extras = [],
  onOpen,
  onNew,
  agregar = false,
  nomes,
}: {
  entity: EntityKey;
  rows: PlannerRow[];
  columns?: string[];
  extras?: ColunaExtra[];
  onOpen: (r: PlannerRow) => void;
  onNew?: () => void;
  agregar?: boolean;
  nomes?: Record<number, string>;
}) {
  const { update } = useEntity(entity);
  const spec = getEntity(entity);
  const campos: FieldSpec[] = (columns ?? spec.fields.map((f) => f.key))
    .map((k) => spec.fields.find((f) => f.key === k)!)
    .filter(Boolean);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
            {campos.map((f) => (
              <th key={f.key} className="px-2 py-2 font-medium">
                {f.label}
              </th>
            ))}
            {extras.map((e) => (
              <th key={e.label} className="px-2 py-2 font-medium">
                {e.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="cursor-pointer border-b border-gray-100 hover:bg-gray-50" onClick={() => onOpen(r)}>
              {campos.map((f) => (
                <td key={f.key} className="px-2 py-2 align-top">
                  {f.type === "bool" ? (
                    <Checkbox
                      className="h-5 w-5"
                      checked={!!r[f.key]}
                      aria-label={`${f.label}: ${r.name as string}`}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(c) => update(r.id, { [f.key]: c === true })}
                    />
                  ) : (
                    <Valor entity={entity} field={f} row={r} nomes={nomes} />
                  )}
                </td>
              ))}
              {extras.map((e) => (
                <td key={e.label} className="px-2 py-2 align-top">
                  {e.render(r)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={campos.length + extras.length}>
                <Vazio>Nenhum registro.</Vazio>
              </td>
            </tr>
          )}
        </tbody>
        {agregar && rows.length > 0 && (
          <tfoot>
            <tr className="text-xs text-gray-500">
              {campos.map((f) => (
                <td key={f.key} className="px-2 py-2">
                  {f.key === "name"
                    ? `Contagem ${rows.length}`
                    : f.type === "bool"
                      ? `${formatarPercent(percentMarcado(rows, f.key))} marcado`
                      : f.type === "money"
                        ? `Soma ${formatarReais(somaValores(rows))}`
                        : ""}
                </td>
              ))}
              {extras.map((e) => (
                <td key={e.label} className="px-2 py-2">
                  {e.agregado?.(rows)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {onNew && <NovoBotao onClick={onNew} />}
    </div>
  );
}

/** Cartão usado por quadro e galeria. */
function Cartao({
  entity,
  row,
  props,
  onOpen,
  extra,
  nomes,
}: {
  entity: EntityKey;
  row: PlannerRow;
  props: string[];
  onOpen: (r: PlannerRow) => void;
  extra?: (r: PlannerRow) => React.ReactNode;
  nomes?: Record<number, string>;
}) {
  const spec = getEntity(entity);
  return (
    <button
      type="button"
      onClick={() => onOpen(row)}
      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="block text-sm font-medium text-gray-900">{row.name as string}</span>
      <span className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
        {props.map((k) => {
          const f = spec.fields.find((x) => x.key === k)!;
          const v = row[k];
          if (v === null || v === undefined || v === false || (Array.isArray(v) && v.length === 0)) return null;
          return <Valor key={k} entity={entity} field={f} row={row} nomes={nomes} />;
        })}
        {extra?.(row)}
      </span>
    </button>
  );
}

/** Quadro (kanban) agrupado por uma propriedade de seleção. */
export function Board({
  entity,
  rows,
  groupBy,
  props = [],
  onOpen,
  onNew,
  extra,
  nomes,
}: {
  entity: EntityKey;
  rows: PlannerRow[];
  groupBy: string;
  props?: string[];
  onOpen: (r: PlannerRow) => void;
  onNew?: (defaults: Record<string, unknown>) => void;
  extra?: (r: PlannerRow) => React.ReactNode;
  nomes?: Record<number, string>;
}) {
  const field = getEntity(entity).fields.find((f) => f.key === groupBy)!;
  const grupos: (string | null)[] = [...field.options!];
  if (rows.some((r) => !r[groupBy])) grupos.unshift(null);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {grupos.map((g) => {
        const itens = rows.filter((r) => (r[groupBy] ?? null) === g);
        return (
          <div key={g ?? "_"} className="w-64 shrink-0 rounded-lg bg-gray-100 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              {g ? (
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", corDaOpcao(field, g))}>{g}</span>
              ) : (
                <span className="text-xs text-gray-500">Sem {field.label.toLowerCase()}</span>
              )}
              <span className="text-xs text-gray-500">{itens.length}</span>
            </div>
            <div className="space-y-2">
              {itens.map((r) => (
                <Cartao key={r.id} entity={entity} row={r} props={props} onOpen={onOpen} extra={extra} nomes={nomes} />
              ))}
            </div>
            {onNew && <NovoBotao onClick={() => onNew(g ? { [groupBy]: g } : {})} />}
          </div>
        );
      })}
    </div>
  );
}

/** Galeria de cartões. */
export function Gallery({
  entity,
  rows,
  props = [],
  onOpen,
  onNew,
  extra,
  vazio = "Nada por aqui.",
}: {
  entity: EntityKey;
  rows: PlannerRow[];
  props?: string[];
  onOpen: (r: PlannerRow) => void;
  onNew?: () => void;
  extra?: (r: PlannerRow) => React.ReactNode;
  vazio?: string;
}) {
  return (
    <div>
      {rows.length === 0 && <Vazio>{vazio}</Vazio>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Cartao key={r.id} entity={entity} row={r} props={props} onOpen={onOpen} extra={extra} />
        ))}
      </div>
      {onNew && <NovoBotao onClick={onNew} />}
    </div>
  );
}

const NOMES_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Calendário mensal (ou semanal), semana começando na segunda.
 * Clicar num dia vazio cria um item já com aquela data.
 */
export function CalendarView({
  entity,
  rows,
  dateField,
  hoje,
  onOpen,
  onNew,
  modo = "mes",
  marcador,
}: {
  entity: EntityKey;
  rows: PlannerRow[];
  dateField: string;
  hoje: string;
  onOpen: (r: PlannerRow) => void;
  onNew?: (defaults: Record<string, unknown>) => void;
  modo?: "mes" | "semana";
  /** Conteúdo extra no topo do item (ex.: ✅ quando feito). */
  marcador?: (r: PlannerRow) => React.ReactNode;
}) {
  const [ancora, setAncora] = useState(hoje);
  const ancoraDate = parseISODate(ancora);

  let dias: (string | null)[];
  let titulo: string;
  if (modo === "semana") {
    dias = diasDaSemana(ancora);
    titulo = `Semana de ${parseISODate(dias[0]!).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`;
  } else {
    const primeiro = toISODate(new Date(ancoraDate.getFullYear(), ancoraDate.getMonth(), 1, 12));
    const total = new Date(ancoraDate.getFullYear(), ancoraDate.getMonth() + 1, 0).getDate();
    const vazios = (parseISODate(primeiro).getDay() + 6) % 7;
    dias = [...Array(vazios).fill(null), ...Array.from({ length: total }, (_, i) => addDays(primeiro, i))];
    while (dias.length % 7) dias.push(null);
    titulo = ancoraDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }

  const mover = (dir: number) => {
    if (modo === "semana") setAncora(addDays(inicioDaSemana(ancora), 7 * dir));
    else setAncora(toISODate(new Date(ancoraDate.getFullYear(), ancoraDate.getMonth() + dir, 1, 12)));
  };

  const porDia = useMemo(() => {
    const m = new Map<string, PlannerRow[]>();
    for (const r of rows) {
      const d = r[dateField] as string | null;
      if (!d) continue;
      m.set(d, [...(m.get(d) ?? []), r]);
    }
    return m;
  }, [rows, dateField]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium text-gray-800">{inicialMaiuscula(titulo)}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => mover(-1)} aria-label="Anterior">
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAncora(hoje)}>
            Hoje
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mover(1)} aria-label="Próximo">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[42rem] grid-cols-7 border-l border-t border-gray-200 text-xs">
          {(modo === "semana" ? DIAS_SEMANA.map((d) => d.slice(0, 3)) : NOMES_CURTOS).map((d) => (
            <div key={d} className="border-b border-r border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-500">
              {d}
            </div>
          ))}
          {dias.map((d, i) => (
            <div
              key={d ?? `v${i}`}
              className={cn(
                "group border-b border-r border-gray-200 p-1",
                modo === "semana" ? "min-h-[8rem]" : "min-h-[5.5rem]",
                !d && "bg-gray-50"
              )}
            >
              {d && (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full",
                        d === hoje ? "bg-red-500 font-bold text-white" : "text-gray-600"
                      )}
                    >
                      {Number(d.slice(8))}
                    </span>
                    {onNew && (
                      <button
                        type="button"
                        aria-label={`Novo em ${d}`}
                        onClick={() => onNew({ [dateField]: d })}
                        className="rounded p-0.5 text-gray-400 opacity-0 hover:bg-gray-100 focus:opacity-100 group-hover:opacity-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {(porDia.get(d) ?? []).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onOpen(r)}
                        className="block w-full truncate rounded bg-white px-1.5 py-1 text-left shadow-sm ring-1 ring-gray-200 hover:bg-blue-50"
                        title={r.name as string}
                      >
                        {marcador?.(r)}
                        {r.name as string}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">{getEntity(entity).label} · clique num dia para adicionar</p>
    </div>
  );
}

/** Abas de visualização — o seletor de views do Notion. */
export function ViewTabs<T extends string>({
  views,
  value,
  onChange,
}: {
  views: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="mb-3 flex flex-wrap gap-1 border-b border-gray-200">
      {views.map((v) => (
        <button
          key={v.id}
          role="tab"
          type="button"
          aria-selected={v.id === value}
          onClick={() => onChange(v.id)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm",
            v.id === value ? "border-gray-900 font-medium text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800"
          )}
        >
          {v.label}
          {v.count !== undefined && <span className="ml-1 text-xs text-gray-400">{v.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Barra de progresso no estilo das fórmulas/rollups do original. */
export function BarraProgresso({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-xs text-gray-400">—</span>;
  const pct = Math.max(0, Math.min(1, valor));
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
        <span
          className={cn("block h-full rounded-full", pct >= 1 ? "bg-green-500" : "bg-blue-500")}
          style={{ width: `${pct * 100}%` }}
        />
      </span>
      <span className="text-xs tabular-nums text-gray-600">{formatarPercent(valor)}</span>
    </span>
  );
}

/** Bloco com título no estilo dos cabeçalhos H3 do template. */
export function Bloco({
  titulo,
  children,
  acao,
  className,
}: {
  titulo?: React.ReactNode;
  children: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white p-4", className)}>
      {(titulo || acao) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          {titulo && <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}
