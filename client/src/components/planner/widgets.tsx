import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  addDays,
  parseISODate,
  progressoHabitos,
  toISODate,
  type PlannerRow,
} from "@shared/planner";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Settings2, Shuffle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { inicialMaiuscula } from "./format";
import { useAgora, useEntity } from "./usePlanner";
import { Bloco, useEditor } from "./views";

/** Relógio digital (substitui o widget Widgetbox "clock/digital"). */
export function DigitalClock() {
  const agora = useAgora(1000);
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl bg-gray-900 p-6 text-white">
      <div className="font-mono text-5xl font-semibold tabular-nums tracking-wider" aria-live="off">
        {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        <span className="text-2xl text-gray-400">
          :{String(agora.getSeconds()).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-300">
        {inicialMaiuscula(agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }))}
      </div>
    </div>
  );
}

/**
 * Calendário simples do mês (substitui o widget Widgetbox "calendar/simple").
 * Os dias com tarefa pendente ganham um ponto — um olhar basta para ver
 * onde a semana está carregada.
 */
export function MiniCalendar({ hoje, marcados = [] }: { hoje: string; marcados?: string[] }) {
  const [mes, setMes] = useState(() => hoje.slice(0, 7));
  const primeiro = `${mes}-01`;
  const d0 = parseISODate(primeiro);
  const total = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  const vazios = (d0.getDay() + 6) % 7;
  const set = useMemo(() => new Set(marcados), [marcados]);
  const mover = (n: number) => setMes(toISODate(new Date(d0.getFullYear(), d0.getMonth() + n, 1, 12)).slice(0, 7));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => mover(-1)} aria-label="Mês anterior" className="rounded p-1 hover:bg-gray-100">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {inicialMaiuscula(d0.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }))}
        </span>
        <button type="button" onClick={() => mover(1)} aria-label="Próximo mês" className="rounded p-1 hover:bg-gray-100">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
          <span key={i} className="font-medium text-gray-400">
            {d}
          </span>
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const dia = addDays(primeiro, i);
          return (
            <span
              key={dia}
              className={cn(
                "relative flex h-7 items-center justify-center rounded-full",
                dia === hoje ? "bg-red-500 font-bold text-white" : "text-gray-700"
              )}
            >
              {i + 1}
              {set.has(dia) && dia !== hoje && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-500" />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type PomodoroConfig = { foco: number; pausa: number; longa: number };
const POMODORO_PADRAO: PomodoroConfig = { foco: 25, pausa: 5, longa: 15 };
type Fase = "foco" | "pausa" | "longa";
const FASES: { id: Fase; label: string }[] = [
  { id: "foco", label: "Foco" },
  { id: "pausa", label: "Pausa curta" },
  { id: "longa", label: "Pausa longa" },
];

function bip() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // sem áudio disponível: o aviso visual basta
  }
}

/**
 * Pomodoro minimalista (substitui o Flocus). O tempo é calculado a partir
 * do instante final, não por contagem de ticks — assim não atrasa quando
 * o navegador desacelera a aba em segundo plano.
 */
export function Pomodoro() {
  const utils = trpc.useUtils();
  const cfgQuery = trpc.planner.getSetting.useQuery({ key: "pomodoro" });
  const salvarCfg = trpc.planner.setSetting.useMutation({
    onSuccess: () => utils.planner.getSetting.invalidate({ key: "pomodoro" }),
  });
  const cfg: PomodoroConfig = useMemo(() => {
    try {
      return { ...POMODORO_PADRAO, ...JSON.parse(cfgQuery.data?.value ?? "{}") };
    } catch {
      return POMODORO_PADRAO;
    }
  }, [cfgQuery.data]);

  const [fase, setFase] = useState<Fase>("foco");
  const [fim, setFim] = useState<number | null>(null);
  const [restante, setRestante] = useState(cfg.foco * 60);
  const [ciclos, setCiclos] = useState(0);
  const [editando, setEditando] = useState(false);
  const agora = useAgora(250);

  useEffect(() => {
    if (fim === null) setRestante(cfg[fase] * 60);
  }, [cfg, fase, fim]);

  const segundos = fim !== null ? Math.max(0, Math.round((fim - agora.getTime()) / 1000)) : restante;
  const terminou = useRef(false);
  useEffect(() => {
    if (fim !== null && segundos === 0 && !terminou.current) {
      terminou.current = true;
      bip();
      const proxima: Fase = fase === "foco" ? ((ciclos + 1) % 4 === 0 ? "longa" : "pausa") : "foco";
      if (fase === "foco") setCiclos((c) => c + 1);
      toast.success(fase === "foco" ? "Foco concluído. Hora da pausa." : "Pausa acabou. Bora focar.");
      setFim(null);
      setFase(proxima);
    }
    if (segundos > 0) terminou.current = false;
  }, [segundos, fim, fase, ciclos]);

  const iniciar = () => setFim(Date.now() + segundos * 1000);
  const pausar = () => {
    setRestante(segundos);
    setFim(null);
  };
  const zerar = () => {
    setFim(null);
    setRestante(cfg[fase] * 60);
  };
  const trocar = (f: Fase) => {
    setFim(null);
    setFase(f);
    setRestante(cfg[f] * 60);
  };

  const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
  const ss = String(segundos % 60).padStart(2, "0");

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-xl p-5 text-white transition-colors",
        fase === "foco" ? "bg-rose-500" : fase === "pausa" ? "bg-teal-500" : "bg-indigo-500"
      )}
    >
      <div className="flex gap-1" role="tablist" aria-label="Fase do Pomodoro">
        {FASES.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={fase === f.id}
            onClick={() => trocar(f.id)}
            className={cn("rounded px-2 py-1 text-xs", fase === f.id ? "bg-white/25 font-semibold" : "hover:bg-white/10")}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="my-3 font-mono text-6xl font-bold tabular-nums" aria-live="off">
        {mm}:{ss}
      </div>
      <div className="flex items-center gap-2">
        {fim === null ? (
          <Button onClick={iniciar} className="bg-white text-gray-900 hover:bg-white/90">
            <Play /> Iniciar
          </Button>
        ) : (
          <Button onClick={pausar} className="bg-white text-gray-900 hover:bg-white/90">
            <Pause /> Pausar
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={zerar} aria-label="Reiniciar" className="text-white hover:bg-white/15">
          <RotateCcw />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditando((e) => !e)}
          aria-label="Ajustar tempos"
          className="text-white hover:bg-white/15"
        >
          <Settings2 />
        </Button>
      </div>
      <p className="mt-2 text-xs text-white/80">Ciclos de foco hoje: {ciclos}</p>
      {editando && (
        <form
          className="mt-3 grid grid-cols-3 gap-2 text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const novo = {
              foco: Math.min(120, Math.max(1, Number(fd.get("foco")))),
              pausa: Math.min(60, Math.max(1, Number(fd.get("pausa")))),
              longa: Math.min(60, Math.max(1, Number(fd.get("longa")))),
            };
            salvarCfg.mutate({ key: "pomodoro", value: JSON.stringify(novo) });
            setEditando(false);
          }}
        >
          {FASES.map((f) => (
            <label key={f.id} className="flex flex-col gap-1">
              {f.label} (min)
              <Input name={f.id} type="number" min={1} max={120} defaultValue={cfg[f.id]} className="h-8 text-gray-900" />
            </label>
          ))}
          <Button type="submit" size="sm" className="col-span-3 bg-white text-gray-900 hover:bg-white/90">
            Salvar tempos
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Contador (substitui o widget Indify "counter"): quantos dias faltam
 * para uma data — prova, entrega, viagem. Título e data ficam salvos.
 */
export function Counter({ hoje }: { hoje: string }) {
  const utils = trpc.useUtils();
  const q = trpc.planner.getSetting.useQuery({ key: "contador" });
  const salvar = trpc.planner.setSetting.useMutation({
    onSuccess: () => utils.planner.getSetting.invalidate({ key: "contador" }),
  });
  const cfg = useMemo(() => {
    try {
      return JSON.parse(q.data?.value ?? "null") as { titulo: string; alvo: string } | null;
    } catch {
      return null;
    }
  }, [q.data]);
  const [editando, setEditando] = useState(false);

  const dias = cfg
    ? Math.round((parseISODate(cfg.alvo).getTime() - parseISODate(hoje).getTime()) / 86_400_000)
    : null;

  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-center text-white">
      {cfg && !editando ? (
        <>
          <div className="text-sm text-white/80">{cfg.titulo}</div>
          <div className="my-1 text-5xl font-bold tabular-nums">{Math.abs(dias!)}</div>
          <div className="text-sm">
            {dias! > 0 ? (dias === 1 ? "dia restante" : "dias restantes") : dias === 0 ? "É hoje!" : "dias desde a data"}
          </div>
          <button type="button" onClick={() => setEditando(true)} className="mt-2 text-xs underline text-white/80">
            Alterar
          </button>
        </>
      ) : (
        <form
          className="space-y-2 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            salvar.mutate({
              key: "contador",
              value: JSON.stringify({ titulo: String(fd.get("titulo") || "Contagem"), alvo: String(fd.get("alvo")) }),
            });
            setEditando(false);
          }}
        >
          <p className="text-sm font-medium">Contador de dias</p>
          <Input name="titulo" placeholder="Ex.: Prova CFP" defaultValue={cfg?.titulo} className="text-gray-900" maxLength={80} />
          <Input name="alvo" type="date" required defaultValue={cfg?.alvo} className="text-gray-900" />
          <Button type="submit" size="sm" className="w-full bg-white text-gray-900 hover:bg-white/90">
            Salvar
          </Button>
        </form>
      )}
    </div>
  );
}

const NIVEL_INFO: Record<string, { emoji: string; dica: string; cor: string }> = {
  Aperitivo: { emoji: "🍬", dica: "≤ 5 min · a qualquer hora", cor: "border-amber-300 bg-amber-50" },
  "Prato principal": { emoji: "🍲", dica: "15–60 min · recarrega de verdade", cor: "border-green-300 bg-green-50" },
  Sobremesa: { emoji: "🍰", dica: "com limite · só depois do dia fechado", cor: "border-pink-300 bg-pink-50" },
};

/**
 * Reservatório de Dopamina: um "menu" de recompensas em três níveis.
 * Quando os seis hábitos do dia estão marcados, sorteia uma sugestão —
 * recompensa logo depois do esforço é o que fixa o hábito.
 */
export function DopamineReservoir({ hoje, diaDeHoje }: { hoje: string; diaDeHoje?: PlannerRow }) {
  const { rows } = useEntity("dopamina");
  const ed = useEditor("dopamina");
  const completo = diaDeHoje ? progressoHabitos(diaDeHoje) === 1 : false;
  const [sorteio, setSorteio] = useState<number>(0);
  const elegiveis = rows.filter((r) => r.nivel !== "Sobremesa");
  const sugestao = elegiveis.length ? elegiveis[(sorteio + Number(hoje.slice(8))) % elegiveis.length] : null;

  return (
    <Bloco
      titulo="🧪 Reservatório de Dopamina"
      acao={
        <Button size="sm" variant="outline" onClick={() => ed.novo({ nivel: "Aperitivo" })}>
          + Recompensa
        </Button>
      }
    >
      <p className="mb-3 text-sm text-gray-600">
        Fez a tarefa → pega uma recompensa. Comece pelo <b>Aperitivo</b>. Deixe a <b>Sobremesa</b> para o fim.
      </p>
      {completo && sugestao && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border-2 border-green-400 bg-green-50 p-3 text-sm">
          <span>
            🎉 Hábitos de hoje 100%! Sugestão: <b>{sugestao.name as string}</b>
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSorteio((s) => s + 1)} aria-label="Outra sugestão">
            <Shuffle />
          </Button>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(NIVEL_INFO).map(([nivel, info]) => (
          <div key={nivel} className={cn("rounded-lg border-2 p-3", info.cor)}>
            <div className="font-semibold">
              {info.emoji} {nivel}
            </div>
            <div className="mb-2 text-xs text-gray-600">{info.dica}</div>
            <ul className="space-y-1">
              {rows
                .filter((r) => r.nivel === nivel)
                .map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => ed.abrir(r)} className="w-full text-left text-sm hover:underline">
                      • {r.name as string}
                      {r.descricao ? <span className="block pl-3 text-xs text-gray-500">{r.descricao as string}</span> : null}
                    </button>
                  </li>
                ))}
            </ul>
            <button
              type="button"
              onClick={() => ed.novo({ nivel })}
              className="mt-2 text-xs text-gray-500 hover:underline"
            >
              + adicionar
            </button>
          </div>
        ))}
      </div>
      {ed.dialog}
    </Bloco>
  );
}

/** Player do Spotify do template original (artista no embed da área Estudos/Leitura). */
export function SpotifyEmbed() {
  return (
    <iframe
      title="Spotify"
      src="https://open.spotify.com/embed/artist/1dABGukgZ8XKKOdd2rVSHM?utm_source=generator&theme=0"
      width="100%"
      height="352"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="rounded-xl border-0"
    />
  );
}
