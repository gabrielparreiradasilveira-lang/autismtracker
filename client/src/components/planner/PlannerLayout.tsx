import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { cn } from "@/lib/utils";
import { AREAS } from "@shared/planner";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { useEntity } from "./usePlanner";

/**
 * Alarme dos Lembretes enquanto o Planner está aberto: no minuto do
 * alarme aparece um aviso na tela (e uma notificação do sistema, se a
 * pessoa já permitiu). A notificação agendada no servidor continua
 * valendo para o Centro de Notificações.
 */
function AlarmeLembretes() {
  const { rows } = useEntity("lembretes");
  const avisados = useRef(new Set<number>());
  useEffect(() => {
    const checar = () => {
      const agora = Date.now();
      for (const r of rows) {
        if (typeof r.alarme !== "string" || avisados.current.has(r.id)) continue;
        const t = new Date(r.alarme).getTime();
        if (t <= agora && agora - t < 60_000) {
          avisados.current.add(r.id);
          toast(`⏰ ${r.name as string}`, { duration: 15_000 });
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`⏰ ${r.name as string}`, { body: (r.categoria as string) ?? "Lembrete" });
          }
        }
      }
    };
    checar();
    const id = setInterval(checar, 15_000);
    return () => clearInterval(id);
  }, [rows]);
  return null;
}

export default function PlannerLayout({ children, titulo }: { children: React.ReactNode; titulo?: string }) {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [location] = useLocation();

  useEffect(() => {
    document.title = titulo ? `${titulo} · Voe Alto` : "Voe Alto. Seja leve.";
  }, [titulo]);

  if (loading) return <PageLoader />;
  if (!isAuthenticated || !user) return null;

  const links = [{ href: "/planner", label: "Painel", emoji: "🦍" }, ...AREAS.map((a) => ({ href: `/planner/${a.slug}`, label: a.label, emoji: a.emoji }))];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <span className="text-lg font-bold text-gray-900">🦍 Voe Alto. Seja leve.</span>
        </div>
        <nav aria-label="Áreas do Planner" className="container mx-auto flex gap-1 overflow-x-auto px-4 pb-2">
          {links.map((l) => {
            const ativo = location === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm",
                  ativo ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {l.emoji} {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container mx-auto space-y-6 px-4 py-6">
        {titulo && <h1 className="text-2xl font-bold text-gray-900">{titulo}</h1>}
        {children}
      </main>
      <AlarmeLembretes />
    </div>
  );
}
