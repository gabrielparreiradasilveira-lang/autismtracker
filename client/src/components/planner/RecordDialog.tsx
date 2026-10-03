import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  MAX_ANEXO_BYTES,
  getEntity,
  type EntityKey,
  type FieldSpec,
  type PlannerRow,
} from "@shared/planner";
import { Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { corDaOpcao } from "./format";
import { useEntity } from "./usePlanner";

type Props = {
  entity: EntityKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Linha a editar; sem ela, o diálogo cria uma nova. */
  row?: PlannerRow | null;
  /** Valores iniciais de uma linha nova (ex.: Data = dia clicado no calendário). */
  defaults?: Record<string, unknown>;
  /** Campos que não aparecem (ex.: a relação, quando o pai já está definido). */
  hide?: string[];
};

/** ISO → valor de <input type="datetime-local"> no fuso local. */
function isoParaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function lerArquivo(file: File): Promise<{ nome: string; tipo: string; dados: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve({ nome: file.name, tipo: file.type, dados: url.slice(url.indexOf(",") + 1) });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Formulário de qualquer base do Planner, montado a partir da
 * especificação — o mesmo papel da página aberta de um item no Notion.
 */
export default function RecordDialog({ entity, open, onOpenChange, row, defaults, hide = [] }: Props) {
  const spec = getEntity(entity);
  const { create, update, remove, saving } = useEntity(entity);
  const [valores, setValores] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    const inicial: Record<string, unknown> = {};
    for (const f of spec.fields) {
      if (f.type === "file") continue; // undefined = anexo mantido como está
      inicial[f.key] = row ? row[f.key] : defaults?.[f.key] ?? (f.type === "bool" ? false : f.type === "multi" ? [] : null);
    }
    setValores(inicial);
  }, [open, row, defaults, spec]);

  const set = (k: string, v: unknown) => setValores((s) => ({ ...s, [k]: v }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    for (const f of spec.fields) {
      if (f.derived) continue;
      let v = valores[f.key];
      if (v === undefined) continue;
      if (v === "") v = null;
      if ((f.type === "int" || f.type === "money" || f.type === "rating") && v !== null) v = Number(v);
      if (f.type === "text" && typeof v === "string") v = v.trim() || (f.required ? "" : null);
      data[f.key] = v;
    }
    try {
      if (row) await update(row.id, data);
      else await create(data);
      toast.success(row ? "Atualizado" : "Criado");
      onOpenChange(false);
    } catch {
      // o hook já mostrou o erro; o diálogo fica aberto para corrigir
    }
  };

  const apagar = async () => {
    if (!row) return;
    if (!window.confirm(`Apagar "${row.name as string}"?`)) return;
    await remove(row.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{row ? `Editar — ${spec.label}` : `Novo — ${spec.label}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          {spec.fields
            .filter((f) => !f.derived && !hide.includes(f.key))
            .map((f) => (
              <Campo
                key={f.key}
                field={f}
                valor={valores[f.key]}
                atual={row?.[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            {row ? (
              <Button type="button" variant="ghost" onClick={apagar} className="text-red-600">
                <Trash2 /> Apagar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  field,
  valor,
  atual,
  onChange,
}: {
  field: FieldSpec;
  valor: unknown;
  atual: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `campo-${field.key}`;
  const rotulo = (
    <Label htmlFor={id}>
      {field.label}
      {field.required && <span className="text-red-600"> *</span>}
    </Label>
  );

  switch (field.type) {
    case "bool":
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={id} checked={!!valor} onCheckedChange={(c) => onChange(c === true)} className="h-5 w-5" />
          {rotulo}
        </div>
      );
    case "longtext":
      return (
        <div className="space-y-1">
          {rotulo}
          <Textarea id={id} rows={6} value={(valor as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "date":
      return (
        <div className="space-y-1">
          {rotulo}
          <div className="flex gap-2">
            <Input
              id={id}
              type="date"
              required={field.required}
              value={(valor as string) ?? ""}
              onChange={(e) => onChange(e.target.value || null)}
            />
            {!field.required && !!valor && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                Limpar
              </Button>
            )}
          </div>
        </div>
      );
    case "datetime":
      return (
        <div className="space-y-1">
          {rotulo}
          <Input
            id={id}
            type="datetime-local"
            value={isoParaLocal(valor as string | null)}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </div>
      );
    case "int":
    case "money":
      return (
        <div className="space-y-1">
          {rotulo}
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            min={0}
            step={field.type === "money" ? "0.01" : "1"}
            required={field.required}
            value={valor === null || valor === undefined ? "" : String(valor)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "select":
      return (
        <div className="space-y-1">
          {rotulo}
          <select
            id={id}
            required={field.required}
            value={(valor as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">—</option>
            {field.options!.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      );
    case "multi": {
      const sel = (valor as string[]) ?? [];
      return (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{field.label}</legend>
          <div className="flex flex-wrap gap-2">
            {field.options!.map((o) => {
              const ativo = sel.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => onChange(ativo ? sel.filter((x) => x !== o) : [...sel, o])}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    ativo ? corDaOpcao(field, o) + " border-transparent" : "border-gray-300 text-gray-600"
                  )}
                >
                  {ativo ? "✓ " : ""}
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case "rating": {
      const n = (valor as number | null) ?? 0;
      return (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{field.label}</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
                onClick={() => onChange(n === i ? null : i)}
                className="text-amber-500"
              >
                <Star className={cn("h-6 w-6", i <= n && "fill-current")} />
              </button>
            ))}
          </div>
        </fieldset>
      );
    }
    case "url":
      return (
        <div className="space-y-1">
          {rotulo}
          <Input
            id={id}
            type="url"
            placeholder="https://"
            value={(valor as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "file": {
      const existente = atual as { nome: string } | null | undefined;
      const novo = valor as { nome: string } | null | undefined;
      const mostrado = novo === undefined ? existente : novo;
      return (
        <div className="space-y-1">
          {rotulo}
          {mostrado && (
            <div className="flex items-center gap-2 text-sm">
              📎 {mostrado.nome}
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                Remover
              </Button>
            </div>
          )}
          <Input
            id={id}
            type="file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_ANEXO_BYTES) {
                toast.error("Anexo maior que 5 MB");
                e.target.value = "";
                return;
              }
              onChange(await lerArquivo(file));
            }}
          />
        </div>
      );
    }
    case "relation":
      return <RelacaoSelect field={field} id={id} rotulo={rotulo} valor={valor as number | null} onChange={onChange} />;
    default:
      return (
        <div className="space-y-1">
          {rotulo}
          <Input
            id={id}
            required={field.required}
            value={(valor as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}

function RelacaoSelect({
  field,
  id,
  rotulo,
  valor,
  onChange,
}: {
  field: FieldSpec;
  id: string;
  rotulo: React.ReactNode;
  valor: number | null;
  onChange: (v: unknown) => void;
}) {
  const alvo = trpc.planner.list.useQuery({ entity: field.target as EntityKey });
  return (
    <div className="space-y-1">
      {rotulo}
      <select
        id={id}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">— nenhuma —</option>
        {(alvo.data ?? []).map((r) => (
          <option key={r.id} value={r.id}>
            {r.name as string}
          </option>
        ))}
      </select>
    </div>
  );
}
