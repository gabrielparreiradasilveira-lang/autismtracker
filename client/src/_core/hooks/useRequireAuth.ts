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
 */
export function useRequireAuth() {
  const auth = useAuth();
  const [, navigate] = useLocation();
  const { loading, isAuthenticated } = auth;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  return auth;
}
