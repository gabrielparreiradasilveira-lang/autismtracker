import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  formatarReais,
  getEntity,
  parseISODate,
  type EntityKey,
  type FieldSpec,
  type PlannerRow,
} from "@shared/planner";
import { Download, ExternalLink, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Cores das etiquetas, na ordem das opções. Escritas por extenso: o
 * Tailwind só gera no CSS de produção as classes que lê literalmente.
 */
const CORES = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-amber-100 text-amber-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-teal-100 text-teal-800",
  "bg-orange-100 text-orange-800",
  "bg-indigo-100 text-indigo-800",
  "bg-lime-100 text-lime-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-gray-200 text-gray-800",
];

export function corDaOpcao(field: FieldSpec, valor: string): string {
  const i = field.options?.indexOf(valor) ?? -1;
  return CORES[(i < 0 ? 11 : i) % CORES.length];
}

export function Chip({ field, valor }: { field: FieldSpec; valor: string }) {
  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium", corDaOpcao(field, valor))}>
      {valor}
    </span>
  );
}

/** "outubro de 2026" → "Outubro de 2026" (o `capitalize` do CSS faria "Outubro De 2026"). */
export function inicialMaiuscula(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** "03/10" ou "03/10/2025" quando não é do ano corrente. */
export function formatarDia(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  const mesmoAno = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("pt-BR", mesmoAno ? { day: "2-digit", month: "2-digit" } : undefined);
}

export function formatarDiaLongo(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function formatarInstante(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Estrelas({ n }: { n: number | null }) {
  if (!n) return null;
  return (
    <span className="inline-flex text-amber-500" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: n }, (_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

/** Baixa o anexo de um item de Estudos Gerais. */
export function BotaoAnexo({ id, nome }: { id: number; nome: string }) {
  const utils = trpc.useUtils();
  const [baixando, setBaixando] = useState(false);
  const baixar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setBaixando(true);
    try {
      const f = await utils.planner.file.fetch({ id });
      const bytes = Uint8Array.from(atob(f.dados), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: f.tipo || "application/octet-stream" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = f.nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Não baixou o anexo");
    } finally {
      setBaixando(false);
    }
  };
  return (
    <button
      type="button"
      onClick={baixar}
      disabled={baixando}
      className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
    >
      <Download className="h-3.5 w-3.5" />
      {nome}
    </button>
  );
}

/**
 * Valor de uma propriedade, do jeito que o Notion mostra numa célula.
 * `nomes` resolve relações (id → nome do registro apontado).
 */
export function Valor({
  entity,
  field,
  row,
  nomes,
}: {
  entity: EntityKey;
  field: FieldSpec;
  row: PlannerRow;
  nomes?: Record<number, string>;
}) {
  const v = row[field.key];
  switch (field.type) {
    case "bool":
      return <span aria-label={v ? "sim" : "não"}>{v ? "✅" : "⬜"}</span>;
    case "date":
      return <span>{formatarDia(v as string | null)}</span>;
    case "datetime":
      return <span>{formatarInstante(v as string | null)}</span>;
    case "money":
      return <span className="tabular-nums">{v === null ? "" : formatarReais(v as number)}</span>;
    case "select":
      return v ? <Chip field={field} valor={v as string} /> : null;
    case "multi":
      return (
        <span className="flex flex-wrap gap-1">
          {((v as string[]) ?? []).map((o) => (
            <Chip key={o} field={field} valor={o} />
          ))}
        </span>
      );
    case "rating":
      return <Estrelas n={v as number | null} />;
    case "url":
      return v ? (
        <a
          href={v as string}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-blue-700 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> abrir
        </a>
      ) : null;
    case "file": {
      const f = v as { nome: string } | null;
      return f && entity === "estudos" ? <BotaoAnexo id={row.id} nome={f.nome} /> : null;
    }
    case "relation":
      return v ? <span className="text-gray-700">↗ {nomes?.[v as number] ?? "—"}</span> : null;
    default:
      return <span>{(v as string | number | null) ?? ""}</span>;
  }
}

export function campo(entity: EntityKey, key: string): FieldSpec {
  const f = getEntity(entity).fields.find((x) => x.key === key);
  if (!f) throw new Error(`Campo ${entity}.${key} não existe`);
  return f;
}
