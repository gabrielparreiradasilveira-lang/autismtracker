import PlannerLayout from "@/components/planner/PlannerLayout";
import { formatarInstante } from "@/components/planner/format";
import { useEntity, useHoje } from "@/components/planner/usePlanner";
import { BarraProgresso, Bloco, RecordList, useEditor, Vazio } from "@/components/planner/views";
import { DigitalClock, DopamineReservoir, MiniCalendar, Pomodoro } from "@/components/planner/widgets";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import {
  AREAS,
  CATEGORIAS_LEMBRETE,
  DIAS_SEMANA,
  FRASE_PAINEL,
  HABITOS,
  filtrarTarefas,
  parseISODate,
  progressoHabitos,
} from "@shared/planner";
import { toast } from "sonner";
import { Link } from "wouter";

/** Painel "Voe Alto. Seja leve." — a página raiz do template. */
export default function PlannerHome() {
  const hoje = useHoje();
  const tarefas = useEntity("tarefas");
  const habitos = useEntity("habitos");
  const notas = useEntity("notas");
  const lembretes = useEntity("lembretes");
  const edTarefa = useEditor("tarefas");
  const edHabito = useEditor("habitos");
  const edNota = useEditor("notas");
  const edLembrete = useEditor("lembretes");

  const toDoHoje = filtrarTarefas(tarefas.rows, "hoje", hoje);
  const surgiuHoje = filtrarTarefas(tarefas.rows, "inbox", hoje);
  const pendentes = tarefas.rows.filter((t) => !t.feito && t.data).map((t) => t.data as string);
  const diaDeHoje = habitos.rows.find((h) => h.data === hoje);
  const notasRecentes = [...notas.rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const utils = trpc.useUtils();
  const criarDiaDeHoje = async () => {
    const idx = (parseISODate(hoje).getDay() + 6) % 7;
    await habitos.create({ name: DIAS_SEMANA[idx], data: hoje });
    utils.planner.list.invalidate();
  };

  return (
    <PlannerLayout>
      <p className="border-l-4 border-gray-900 pl-3 text-lg italic text-gray-700">{FRASE_PAINEL}</p>

      {/* Linha 1: Áreas | Calendário | Relógio */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloco titulo="🧠 Áreas">
          <div className="grid grid-cols-2 gap-2">
            {AREAS.map((a) => (
              <Link
                key={a.slug}
                href={`/planner/${a.slug}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm font-medium hover:bg-gray-50 hover:shadow-sm"
              >
                <span className="text-xl" aria-hidden>
                  {a.emoji}
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </Bloco>
        <MiniCalendar hoje={hoje} marcados={pendentes} />
        <DigitalClock />
      </div>

      {/* Linha 2: To-do Hoje | Pomodoro | Rotina/Hábitos (Dia) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloco titulo="To-do Hoje">
          <RecordList
            entity="tarefas"
            rows={toDoHoje}
            doneField="feito"
            props={["prioridade", "contexto"]}
            onOpen={edTarefa.abrir}
            onNew={() => edTarefa.novo({ data: hoje })}
            vazio="Nada marcado para hoje. 🎈"
          />
        </Bloco>
        <Pomodoro />
        <Bloco
          titulo="Rotina/Hábitos"
          acao={
            diaDeHoje && (
              <Link href="/planner/habitos" className="text-xs text-gray-500 hover:underline">
                ver semana →
              </Link>
            )
          }
        >
          {diaDeHoje ? (
            <div className="space-y-2">
              <button type="button" onClick={() => edHabito.abrir(diaDeHoje)} className="text-sm font-medium hover:underline">
                {diaDeHoje.name as string}
              </button>
              <ul className="grid grid-cols-2 gap-2">
                {HABITOS.map((h) => (
                  <li key={h.key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-2 py-2 text-sm hover:bg-gray-50">
                      <Checkbox
                        className="h-5 w-5"
                        checked={!!diaDeHoje[h.key]}
                        onCheckedChange={(c) => habitos.update(diaDeHoje.id, { [h.key]: c === true })}
                      />
                      <span aria-hidden>{h.emoji}</span> {h.label}
                    </label>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                Progresso <BarraProgresso valor={progressoHabitos(diaDeHoje)} />
              </div>
            </div>
          ) : (
            <div>
              <Vazio>Hoje ainda não tem linha no Tracker.</Vazio>
              <Button size="sm" onClick={criarDiaDeHoje}>
                Criar o dia de hoje
              </Button>
            </div>
          )}
        </Bloco>
      </div>

      {/* Linha 3: Atividades que surgiram hoje | Notas e Ideias | Lembretes */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloco titulo="Atividades que surgiram hoje">
          <RecordList
            entity="tarefas"
            rows={surgiuHoje}
            doneField="feito"
            props={["prioridade", "contexto"]}
            onOpen={edTarefa.abrir}
            onNew={() => edTarefa.novo({})}
            vazio="Surgiu algo? Anote aqui sem data e decida depois."
          />
        </Bloco>
        <Bloco titulo="Notas e Ideias" acao={<span className="text-xs text-gray-400">{notas.rows.length}</span>}>
          <RecordList
            entity="notas"
            rows={notasRecentes}
            onOpen={edNota.abrir}
            onNew={() => edNota.novo()}
            vazio="Nenhuma nota ainda."
          />
        </Bloco>
        <Bloco titulo="Lembretes">
          {CATEGORIAS_LEMBRETE.map((cat) => {
            const itens = lembretes.rows.filter((l) => l.categoria === cat);
            return (
              <div key={cat} className="mb-3">
                <div className="mb-1 text-xs font-semibold uppercase text-gray-500">
                  {cat} · {itens.length}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {itens.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => edLembrete.abrir(l)}
                      className="rounded-lg border border-gray-200 p-2 text-left text-sm hover:shadow-sm"
                    >
                      <span className="block font-medium">{l.name as string}</span>
                      {l.alarme ? (
                        <span className="text-xs text-gray-500">⏰ {formatarInstante(l.alarme as string)}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => edLembrete.novo({ categoria: cat })}
                  className="mt-1 text-xs text-gray-500 hover:underline"
                >
                  + Novo
                </button>
              </div>
            );
          })}
          {lembretes.rows.some((l) => !l.categoria) && (
            <RecordList
              entity="lembretes"
              rows={lembretes.rows.filter((l) => !l.categoria)}
              props={["alarme"]}
              onOpen={edLembrete.abrir}
            />
          )}
          {"Notification" in window && Notification.permission === "default" && (
            <button
              type="button"
              className="text-xs text-blue-700 hover:underline"
              onClick={async () => {
                const p = await Notification.requestPermission();
                if (p === "granted") toast.success("Alarmes também vão aparecer como notificação do sistema.");
              }}
            >
              Ativar alarme no sistema
            </button>
          )}
        </Bloco>
      </div>

      <DopamineReservoir hoje={hoje} diaDeHoje={diaDeHoje} />

      {edTarefa.dialog}
      {edHabito.dialog}
      {edNota.dialog}
      {edLembrete.dialog}
    </PlannerLayout>
  );
}
