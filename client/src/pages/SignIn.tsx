import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function SignIn() {
  const { user, isAuthenticated, refetch } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signinMutation = trpc.auth.signin.useMutation({
    onSuccess: async () => {
      await refetch();
      navigate("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Não foi possível entrar");
    },
  });

  useEffect(() => {
    if (isAuthenticated && user) navigate("/dashboard");
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signinMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto mb-2 bg-blue-600 rounded-xl flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <p className="text-sm text-gray-600">Bem-vindo de volta ao Apoio Autismo</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                autoComplete="current-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={signinMutation.isPending}
            >
              {signinMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="text-sm text-center text-gray-600 mt-4">
            Ainda não tem conta?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
