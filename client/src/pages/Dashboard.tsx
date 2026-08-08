import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Brain, Calendar, Shield, Activity, Settings, LogOut, BarChart3, GitBranch, Sparkles, Bell, Trophy, Users, MessageSquare, Wind, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Apoio Autismo</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Olá, {user.name || "Usuário"}!</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Bem-vindo ao seu espaço de bem-estar</p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/mood">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <Heart className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Diário de Humor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Registre como você está se sentindo hoje
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/triggers">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-200">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Gatilhos Sensoriais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gerencie seus gatilhos e estratégias de enfrentamento
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/routines">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Rotinas Diárias</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Organize e acompanhe suas rotinas
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/breathing">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-pink-200">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
                  <Brain className="w-6 h-6 text-pink-600" />
                </div>
                <CardTitle className="text-lg">Exercícios de Respiração</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Pratique técnicas de autorregulação
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/techniques">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-pink-200">
              <CardHeader>
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
                  <Wind className="w-6 h-6 text-pink-600" />
                </div>
                <CardTitle className="text-lg">Biblioteca de Técnicas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Descubra e favorite técnicas de autorregulação
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/symptoms">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-indigo-200">
              <CardHeader>
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
                  <ClipboardList className="w-6 h-6 text-indigo-600" />
                </div>
                <CardTitle className="text-lg">Monitoramento de Sintomas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Registre e acompanhe sintomas com severidade e intervenções
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/reminders">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-yellow-200">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                  <Bell className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Lembretes Inteligentes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Configure lembretes adaptativos para seus registros
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/export">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-cyan-200">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-2">
                  <Activity className="w-6 h-6 text-cyan-600" />
                </div>
                <CardTitle className="text-lg">Exportar Dados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Compartilhe seus dados com profissionais
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-gray-200">
              <CardHeader>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <Settings className="w-6 h-6 text-gray-600" />
                </div>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Personalize sua experiência
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/achievements">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-yellow-200">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
                <CardTitle className="text-lg">Conquistas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Desbloqueie badges e recompensas
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/emergency-contacts">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-red-200">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-lg">Contatos de Emergência</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Gerencie seus contatos de confiança
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/preset-messages">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Mensagens Pré-escritas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Crie mensagens rápidas para crises
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Análises e Insights</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Link href="/analytics">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Análise de Padrões</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Visualize tendências e padrões nos seus dados
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/correlations">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-purple-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                    <GitBranch className="w-6 h-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Correlações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Entenda como gatilhos afetam seu bem-estar
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/predictions">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-indigo-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <CardTitle className="text-lg">Previsões</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Antecipe padrões e planeje seu bem-estar
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Suas atividades recentes aparecerão aqui
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
