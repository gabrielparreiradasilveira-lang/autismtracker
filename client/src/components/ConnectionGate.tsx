import { WifiOff } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

/** Rotas que funcionam sem sessão — nelas não faz sentido bloquear a tela. */
const PUBLIC_ROUTES = ["/", "/signin", "/signup", "/404"];

/**
 * Avisa quando o app não está conseguindo falar com o servidor.
 *
 * Sem isto, uma falha de rede era indistinguível de "você não tem
 * sessão": a pessoa era levada para a página de login mesmo com o cookie
 * válido — justo no cenário em que o app mais precisa funcionar, aberto
 * no celular sem sinal.
 *
 * Dois estados, porque as consequências são diferentes:
 * - sem rede e sem dados carregados: não há o que mostrar, então ocupamos
 *   a tela explicando a situação e oferecendo tentar de novo;
 * - sem rede mas com dados já carregados: o app continua utilizável, e
 *   basta uma faixa avisando que o que está na tela pode estar defasado.
 */
export default function ConnectionGate() {
  const { isOffline, user, refetch } = useAuth();
  const [location] = useLocation();

  if (!isOffline) return null;

  // Numa rota pública, quem chega pode nem ter conta: tomar a tela com
  // "sem conexão" atrapalharia mais do que ajuda.
  if (!user && PUBLIC_ROUTES.includes(location)) return null;

  if (user) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-50 bg-amber-100 border-b border-amber-300 px-4 py-2 text-sm text-amber-900 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center"
      >
        <span className="flex items-center gap-2">
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          Sem conexão. As informações na tela podem estar desatualizadas.
        </span>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center p-6"
    >
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8 text-amber-600" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Sem conexão</h1>
        <p className="text-gray-600 mb-1">
          Não foi possível falar com o servidor agora.
        </p>
        <p className="text-gray-600 mb-6">
          Seus registros continuam salvos. Nada foi perdido.
        </p>
        <Button onClick={() => refetch()}>Tentar de novo</Button>
      </div>
    </div>
  );
}
