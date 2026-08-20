import { trpc } from "@/lib/trpc";

/**
 * Estado da sessão, separando "não tem sessão" de "não deu para perguntar".
 *
 * `auth.me` é um publicProcedure que devolve `ctx.user`: quando não há
 * sessão ele responde `null` com sucesso. Só falha de verdade quando a
 * requisição não chega ao servidor. Antes, os dois casos colapsavam em
 * "não autenticado" e o app expulsava para a tela de login quem estava
 * apenas sem sinal — com o cookie de sessão intacto.
 */
export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    // Oscilação de rede no celular é comum; tentar de novo antes de
    // tratar como offline evita alarme falso.
    retry: 2,
    staleTime: 60 * 1000,
  });

  const user = meQuery.data ?? null;

  return {
    user,
    isAuthenticated: !!user,
    loading: meQuery.isLoading,
    /** O servidor respondeu, e a resposta foi: não há sessão. */
    isSignedOut: meQuery.isSuccess && meQuery.data == null,
    /** Não foi possível falar com o servidor. Nada se conclui sobre a sessão. */
    isOffline: meQuery.isError,
    refetch: meQuery.refetch,
  };
}
