import { trpc } from "@/lib/trpc";

export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60 * 1000,
  });

  const user = meQuery.data ?? null;

  return {
    user,
    isAuthenticated: !!user,
    loading: meQuery.isLoading,
    refetch: meQuery.refetch,
  };
}
