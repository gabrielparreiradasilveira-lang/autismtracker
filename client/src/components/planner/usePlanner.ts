import { trpc } from "@/lib/trpc";
import { toISODate, type EntityKey, type PlannerRow } from "@shared/planner";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Uma base do Planner: as linhas e as três mutações.
 *
 * Toda mutação invalida todas as listagens do Planner, não só a da base
 * mexida: as bases se cruzam (ações → metas, tarefas → projetos, apagar
 * um pai solta os filhos), e uma tela com número desatualizado engana
 * mais do que uma consulta a mais custa.
 */
export function useEntity(entity: EntityKey) {
  const utils = trpc.useUtils();
  const query = trpc.planner.list.useQuery({ entity });
  const invalidate = () => utils.planner.list.invalidate();

  const create = trpc.planner.create.useMutation({
    onSuccess: invalidate,
    onError: (e) => toast.error("Não salvou: " + e.message),
  });
  const update = trpc.planner.update.useMutation({
    onSuccess: invalidate,
    onError: (e) => toast.error("Não salvou: " + e.message),
  });
  const remove = trpc.planner.delete.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success("Apagado");
    },
    onError: (e) => toast.error("Não apagou: " + e.message),
  });

  return {
    rows: (query.data ?? []) as PlannerRow[],
    isLoading: query.isLoading,
    create: (data: Record<string, unknown>) => create.mutateAsync({ entity, data }),
    update: (id: number, data: Record<string, unknown>) => update.mutateAsync({ entity, id, data }),
    remove: (id: number) => remove.mutateAsync({ entity, id }),
    saving: create.isPending || update.isPending,
  };
}

/**
 * O dia de hoje ("YYYY-MM-DD", fuso local), atualizado sozinho quando
 * vira a meia-noite com a tela aberta — senão o "To-do Hoje" de quem
 * deixa o painel aberto de um dia para o outro mostraria o dia errado.
 */
export function useHoje(): string {
  const [hoje, setHoje] = useState(() => toISODate(new Date()));
  useEffect(() => {
    const id = setInterval(() => {
      const agora = toISODate(new Date());
      setHoje((h) => (h === agora ? h : agora));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return hoje;
}

/** Instante atual, a cada segundo (relógio, contador, alarmes). */
export function useAgora(intervalo = 1000): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), intervalo);
    return () => clearInterval(id);
  }, [intervalo]);
  return agora;
}
