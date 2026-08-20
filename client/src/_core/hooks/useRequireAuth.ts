import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "./useAuth";

/**
 * useAuth + redirecionamento para a home quando não há sessão.
 *
 * O redirect acontece num efeito, não durante o render: navegar no corpo
 * do componente (o antigo `window.location.href = "/"`) é um efeito
 * colateral no render, recarrega a página inteira e descarta o estado do
 * SPA. Chame este hook junto dos demais, antes de qualquer `return`
 * condicional, para respeitar as Rules of Hooks.
 *
 * Uso típico:
 *
 *   const { user, isAuthenticated, loading } = useRequireAuth();
 *   if (loading) return <PageLoader />;
 *   if (!isAuthenticated || !user) return null;
 *
 * O `return null` cobre dois casos: a sessão acabou (e o efeito abaixo já
 * está levando para a home) ou estamos sem rede. No segundo, quem informa
 * o usuário é o ConnectionGate montado em App.tsx — por isso as páginas
 * podem seguir simplesmente devolvendo null.
 */
export function useRequireAuth() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const { isSignedOut } = auth;

  useEffect(() => {
    // Só redireciona quando o servidor confirmou que não há sessão.
    // Falha de rede não é motivo para expulsar ninguém: o cookie pode
    // estar perfeitamente válido, e antes bastava um blip de conexão no
    // celular para a pessoa cair na página de login.
    if (isSignedOut) {
      navigate("/");
    }
  }, [isSignedOut, navigate]);

  return auth;
}
