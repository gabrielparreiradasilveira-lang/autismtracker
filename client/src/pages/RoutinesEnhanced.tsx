import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ArrowLeft, TrendingUp, Brain, Clock } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { RoutineStreaks } from "@/components/RoutineStreaks";
import { RoutineProgressChart } from "@/components/RoutineProgressChart";

export default function RoutinesEnhanced() {
  const { user, isAuthenticated, loading } = useAuth();

  const streaksQuery = trpc.routineAnalytics.getStreaks.useQuery();
  const progressQuery = trpc.routineAnalytics.getProgress.useQuery({ period: "week" });
  const correlationsQuery = trpc.routineAnalytics.getCorrelations.useQuery();
  const bestTimesQuery = trpc.routineAnalytics.getBestTimes.useQuery();
  const adhesionQuery = trpc.routineAnalytics.getAdhesion.useQuery({ period: "month" });
  const statsQuery = trpc.routineAnalytics.getUserStats.useQuery();

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
        <div className="container mx-auto px-4 py-4">
          <Link href="/routines">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Rotinas
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Análise de Rotinas</h1>
              <p className="text-gray-600">Acompanhe seu progresso e conquistas</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="correlations">Correlações</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* User Stats */}
            {statsQuery.data && (
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Nível Atual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-bold text-purple-600 mb-2">
                      {statsQuery.data.level}
                    </div>
                    <p className="text-sm text-purple-700">
                      {statsQuery.data.totalPoints} pontos acumulados
                    </p>
                    <div className="mt-4 w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(statsQuery.data.totalPoints % 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Rotinas Ativas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                      {statsQuery.data.activeRoutines}
                    </div>
                    <p className="text-sm text-blue-700">
                      de {statsQuery.data.totalRoutines} rotinas criadas
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Total de Conclusões</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-5xl font-bold text-green-600 mb-2">
                      {statsQuery.data.totalCompletions}
                    </div>
                    <p className="text-sm text-green-700">
                      Melhor sequência: {statsQuery.data.bestStreak} dias
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Streaks */}
            {streaksQuery.data && <RoutineStreaks streaks={streaksQuery.data} />}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            {progressQuery.data && (
              <RoutineProgressChart
                data={progressQuery.data.chartData}
                period="week"
              />
            )}

            {/* Adhesion Card */}
            {adhesionQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Taxa de Adesão
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-6xl font-bold text-green-600">
                      {adhesionQuery.data.adhesionRate}%
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {adhesionQuery.data.completedEntries} de {adhesionQuery.data.totalEntries} rotinas completadas
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {adhesionQuery.data.weeklyBreakdown.map((week, idx) => (
                      <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{week.rate}%</div>
                        <div className="text-xs text-gray-600">
                          {week.week === 0 ? "Esta semana" : `${week.week} sem atrás`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Best Times */}
            {bestTimesQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Melhores Horários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Baseado em suas rotinas completadas, você tem melhor desempenho durante:
                  </p>
                  <div className="grid md:grid-cols-4 gap-4">
                    {bestTimesQuery.data.bestTimes.map((time, idx) => (
                      <div
                        key={time.timeOfDay}
                        className={`p-4 rounded-lg border-2 ${
                          idx === 0
                            ? "bg-blue-50 border-blue-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {time.completions}
                          </div>
                          <div className="text-sm text-gray-700 font-medium">
                            {time.label}
                          </div>
                          {idx === 0 && (
                            <div className="mt-2 text-xs text-blue-600 font-semibold">
                              ⭐ Melhor horário
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Recomendação:</strong> Agende suas rotinas mais importantes durante{" "}
                      <strong>{bestTimesQuery.data.recommendation}</strong> para maximizar suas chances de sucesso!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Correlations Tab */}
          <TabsContent value="correlations" className="space-y-6">
            {correlationsQuery.data && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    Correlação com Humor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {correlationsQuery.data.hasSufficientData ? (
                    <>
                      <p className="text-sm text-gray-600 mb-6">
                        {correlationsQuery.data.message}
                      </p>
                      {correlationsQuery.data.correlations.map((corr, idx) => (
                        <div key={idx} className="mb-6">
                          <h4 className="font-semibold text-gray-900 mb-3">{corr.metric}</h4>
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-sm text-green-700 mb-1">Com Rotinas</div>
                              <div className="text-3xl font-bold text-green-600">
                                {corr.withRoutines}
                              </div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="text-sm text-orange-700 mb-1">Sem Rotinas</div>
                              <div className="text-3xl font-bold text-orange-600">
                                {corr.withoutRoutines}
                              </div>
                            </div>
                            <div className={`p-4 rounded-lg border ${
                              corr.impact === "Positivo"
                                ? "bg-blue-50 border-blue-200"
                                : corr.impact === "Negativo"
                                ? "bg-red-50 border-red-200"
                                : "bg-gray-50 border-gray-200"
                            }`}>
                              <div className="text-sm text-gray-700 mb-1">Impacto</div>
                              <div className={`text-3xl font-bold ${
                                corr.impact === "Positivo"
                                  ? "text-blue-600"
                                  : corr.impact === "Negativo"
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }`}>
                                {corr.improvement > 0 ? "+" : ""}{corr.improvement}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">{corr.impact}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-800">
                          💡 <strong>Insight:</strong> Manter suas rotinas diárias tem um impacto{" "}
                          <strong>{correlationsQuery.data.correlations[0]?.impact.toLowerCase()}</strong>{" "}
                          no seu humor. Continue assim!
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">{correlationsQuery.data.message}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
