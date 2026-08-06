import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
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

export default function Analytics() {
  const { user, isAuthenticated, loading } = useAuth();
  
  const patternsQuery = trpc.analytics.patterns.useQuery();
  const trendsQuery = trpc.analytics.trends.useQuery({ days: 30 });

  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [loading, isAuthenticated, navigate]);

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

  // Prepare chart data for trigger frequency
  const triggerChartData = {
    labels: Object.keys(patterns?.triggerFrequency || {}),
    datasets: [
      {
        label: "Frequência de Gatilhos",
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
                  <CardTitle>Frequência de Gatilhos por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Bar data={triggerChartData} options={barChartOptions} />
                  </div>
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
                    <span className="text-sm text-gray-600">Total de Gatilhos Registrados</span>
                    <span className="font-semibold">{patterns.totalTriggers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Categorias de Gatilhos</span>
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
                Dados insuficientes para análise. Continue registrando seu humor e gatilhos.
              </p>
              <Link href="/mood">
                <Button>Registrar Humor</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
