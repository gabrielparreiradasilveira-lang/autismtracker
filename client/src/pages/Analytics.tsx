import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import InsightSection from "@/components/InsightSection";
import DataCoveragePanel from "@/components/DataCoveragePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fusoDoUsuario } from "@/lib/timezone";
import { plural } from "@/lib/utils";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/** Mesmos rótulos usados na tela de Gatilhos. */
const categoriaDeGatilho: Record<string, string> = {
  sound: "Som",
  light: "Luz",
  texture: "Textura",
  smell: "Cheiro",
  taste: "Sabor",
  visual: "Visual",
  other: "Outro / sem cadastro",
};

export default function Analytics() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  
  const patternsQuery = trpc.analytics.patterns.useQuery({ days: 30, timezoneOffsetMinutes: fusoDoUsuario() });
  const trendsQuery = trpc.analytics.trends.useQuery({ days: 30 });
  const symptomAnalyticsQuery = trpc.symptoms.getAnalytics.useQuery({ days: 30, timezoneOffsetMinutes: fusoDoUsuario() });
  const techniqueAnalyticsQuery = trpc.techniques.getAnalytics.useQuery();
  const byTimeOfDayQuery = trpc.analytics.byTimeOfDay.useQuery({ days: 90, timezoneOffsetMinutes: fusoDoUsuario() });

  if (loading) return <PageLoader />;


  if (!isAuthenticated || !user) return null;

  const patterns = patternsQuery.data;
  const trends = trendsQuery.data;

  // Prepare chart data for mood trends
  const trendChartData = {
    labels: trends?.entries.map(e => new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })) || [],
    datasets: [
      {
        label: "Humor",
        data: trends?.entries.map(e => e.mood) || [],
        borderColor: "rgb(147, 51, 234)",
        backgroundColor: "rgba(147, 51, 234, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Ansiedade",
        data: trends?.entries.map(e => e.anxiety) || [],
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Estresse",
        data: trends?.entries.map(e => e.stress) || [],
        borderColor: "rgb(249, 115, 22)",
        backgroundColor: "rgba(249, 115, 22, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Energia",
        data: trends?.entries.map(e => e.energy) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Frequência de gatilhos: agora são ocorrências registradas, não
  // quantos gatilhos existem cadastrados em cada categoria.
  const triggerChartData = {
    labels: Object.keys(patterns?.triggerFrequency || {}).map(
      (categoria) => categoriaDeGatilho[categoria] || categoria
    ),
    datasets: [
      {
        label: "Ocorrências registradas",
        data: Object.values(patterns?.triggerFrequency || {}),
        backgroundColor: [
          "rgba(147, 51, 234, 0.7)",
          "rgba(59, 130, 246, 0.7)",
          "rgba(34, 197, 94, 0.7)",
          "rgba(249, 115, 22, 0.7)",
          "rgba(239, 68, 68, 0.7)",
          "rgba(236, 72, 153, 0.7)",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const symptomAnalytics = symptomAnalyticsQuery.data;
  const techniqueAnalytics = techniqueAnalyticsQuery.data;

  const symptomTypeLabels: Record<string, string> = {
    social_interaction: "Interação Social",
    communication: "Comunicação",
    repetitive_behavior: "Comportamento Repetitivo",
    sensory_sensitivity: "Sensibilidade Sensorial",
    focus: "Foco e Atenção",
    executive_function: "Função Executiva",
  };

  const severityTrendChartData = {
    labels: symptomAnalytics?.severityTrend.map((d) =>
      new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    ) || [],
    datasets: [
      {
        label: "Severidade Média",
        data: symptomAnalytics?.severityTrend.map((d) => d.averageSeverity) || [],
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Análise de Padrões</h1>
          </div>
          <p className="text-gray-600">Visualize tendências e padrões nos seus dados</p>
        </div>

        {/* Insights vêm primeiro: o número sozinho não diz o que fazer. */}
        <div className="mb-8">
          <InsightSection showMissing={false} />
        </div>

        {/* Quanto dado existe e o que ele libera. Fica antes dos gráficos
            porque é o que responde "por que estou vendo pouca coisa". */}
        <div className="mb-8">
          <DataCoveragePanel />
        </div>

        {patternsQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Carregando análises...</p>
            </CardContent>
          </Card>
        ) : patterns && patterns.totalEntries > 0 ? (
          <div className="space-y-6">
            {/* Averages */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Humor Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {patterns.averages.mood.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">de 10</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Ansiedade Média</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {patterns.averages.anxiety.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">de 10</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Estresse Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {patterns.averages.stress.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">de 10</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Energia Média</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {patterns.averages.energy.toFixed(1)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">de 10</p>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-gray-600">
              Médias dos últimos {patterns.days} dias, sobre{" "}
              {plural(patterns.totalEntries, "registro", "registros")} de humor.
            </p>

            {/* Humor por período do dia */}
            {(byTimeOfDayQuery.data?.byTimeOfDay.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Humor por Período do Dia</CardTitle>
                  <p className="text-sm text-gray-600">
                    Média dos seus registros nos últimos {byTimeOfDayQuery.data!.days} dias,
                    agrupados pela hora em que você registrou.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {byTimeOfDayQuery.data!.byTimeOfDay.map((faixa) => (
                    <div key={faixa.timeOfDay} className="flex justify-between items-start gap-3">
                      <span className="text-sm text-gray-600">{faixa.label}</span>
                      <span className="text-right">
                        <span className="font-semibold block">
                          Humor {faixa.averageMood}/10 · ansiedade {faixa.averageAnxiety}/10
                        </span>
                        <span className="text-xs text-gray-500">
                          {plural(faixa.count, "registro", "registros")}
                        </span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Trend Chart */}
            {trends && trends.entries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendências dos Últimos 30 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Line data={trendChartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trigger Frequency */}
            {Object.keys(patterns.triggerFrequency).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Ocorrências de Gatilhos por Categoria</CardTitle>
                  <p className="text-sm text-gray-600">
                    Quantas vezes cada categoria apareceu nos seus registros de humor e de
                    sintoma nos últimos {patterns.days} dias — não quantos gatilhos você
                    tem cadastrados.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Bar data={triggerChartData} options={barChartOptions} />
                  </div>
                  {patterns.triggersSemCadastro.length > 0 && (
                    <p className="text-sm text-gray-700 mt-4 p-3 bg-gray-50 rounded-lg">
                      Estes gatilhos aparecem nos seus registros e ainda não estão
                      cadastrados, por isso contam como "Outro / sem cadastro":{" "}
                      {patterns.triggersSemCadastro.join(", ")}. Cadastrá-los permite
                      classificá-los por categoria e guardar uma estratégia de enfrentamento
                      para cada um.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Statistics */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas Gerais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total de Entradas de Humor</span>
                    <span className="font-semibold">{patterns.totalEntries}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gatilhos Cadastrados</span>
                    <span className="font-semibold">{patterns.totalTriggers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ocorrências de Gatilhos</span>
                    <span className="font-semibold">{patterns.triggerOccurrences}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Categorias com Ocorrência</span>
                    <span className="font-semibold">{Object.keys(patterns.triggerFrequency).length}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    {patterns.averages.mood >= 7 ? (
                      <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : patterns.averages.mood >= 5 ? (
                      <Minus className="w-5 h-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Humor Geral</p>
                      <p className="text-xs text-gray-600">
                        {patterns.averages.mood >= 7
                          ? "Seu humor está acima da média. Continue assim!"
                          : patterns.averages.mood >= 5
                          ? "Seu humor está na média. Considere técnicas de bem-estar."
                          : "Seu humor está abaixo da média. Considere buscar apoio profissional."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {patterns.averages.anxiety <= 4 ? (
                      <TrendingDown className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : patterns.averages.anxiety <= 6 ? (
                      <Minus className="w-5 h-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Níveis de Ansiedade</p>
                      <p className="text-xs text-gray-600">
                        {patterns.averages.anxiety <= 4
                          ? "Seus níveis de ansiedade estão controlados."
                          : patterns.averages.anxiety <= 6
                          ? "Ansiedade moderada. Pratique exercícios de respiração."
                          : "Ansiedade elevada. Considere técnicas de relaxamento."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                Você ainda não tem registros de humor. Os gráficos desta tela aparecem a partir do
                primeiro registro.
              </p>
              <Link href="/mood">
                <Button>Registrar Humor</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Symptoms */}
        {symptomAnalytics && symptomAnalytics.totalEntries > 0 && (
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Sintomas</h2>

            {symptomAnalytics.severityTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendência de Severidade (Últimos 30 Dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Line data={severityTrendChartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Severidade Média por Tipo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {symptomAnalytics.averageSeverityByType.map((item) => {
                    const duracao = symptomAnalytics.durationBySymptomType.find(
                      (d) => d.symptomType === item.symptomType
                    );
                    return (
                      <div key={item.symptomType} className="flex justify-between items-start gap-3">
                        <span className="text-sm text-gray-600">
                          {symptomTypeLabels[item.symptomType] || item.symptomType}
                        </span>
                        <span className="text-right">
                          <span className="font-semibold block">
                            {item.averageSeverity}/10 ({item.count}x)
                          </span>
                          {duracao && (
                            <span className="text-xs text-gray-500">
                              dura em média {plural(duracao.averageDuration, "minuto", "minutos")}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Efetividade das Intervenções</CardTitle>
                </CardHeader>
                <CardContent>
                  {symptomAnalytics.averageEffectiveness != null ? (
                    <>
                      <div className="text-3xl font-bold text-teal-600">
                        {symptomAnalytics.averageEffectiveness}/10
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Média de {plural(symptomAnalytics.interventionsLoggedCount, "registro", "registros")} com intervenção
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Registre intervenções e sua efetividade em Monitoramento de Sintomas para ver esta análise.
                    </p>
                  )}
                  {symptomAnalytics.topTriggers.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Gatilhos mais frequentes:</p>
                      <div className="flex flex-wrap gap-1">
                        {symptomAnalytics.topTriggers.map((t) => (
                          <span
                            key={t.trigger}
                            className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded"
                          >
                            {t.trigger} ({t.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Techniques */}
        {techniqueAnalytics && techniqueAnalytics.totalTechniquesUsed > 0 && (
          <div className="space-y-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900">Técnicas mais eficazes</h2>
            <Card>
              <CardContent className="p-6">
                {techniqueAnalytics.mostEffective.length > 0 ? (
                  <div className="space-y-3">
                    {techniqueAnalytics.mostEffective.map((technique) => (
                      <div key={technique.id} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{technique.title}</span>
                        <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded">
                          Efetividade {technique.effectiveness}/10 · usada {technique.usageCount}x
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Registre a efetividade das suas técnicas na Biblioteca de Técnicas para ver este ranking.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
