import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import InsightSection from "@/components/InsightSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowLeft, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * Esta tela compara duas janelas de tempo (últimos 7 registros vs. todo o
 * histórico). Ela não projeta o futuro, e a redação abaixo evita
 * qualquer formulação que sugira isso.
 */
export default function Predictions() {
  const { user, isAuthenticated, loading } = useRequireAuth();

  const comparisonQuery = trpc.analytics.predictions.useQuery();

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  const data = comparisonQuery.data;

  const describeDelta = (recent: number, historical: number, lowerIsBetter = false) => {
    const diff = recent - historical;
    if (Math.abs(diff) < 0.5) {
      return {
        icon: Info,
        className: "bg-blue-100 text-blue-700",
        text: "Sem mudança relevante",
      };
    }
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    return {
      icon: improved ? TrendingUp : TrendingDown,
      className: improved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700",
      text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} em relação ao seu histórico`,
    };
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
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Previsões e Tendências</h1>
          </div>
          <p className="text-gray-600">
            Compare seus registros recentes com todo o seu histórico
          </p>
        </div>

        {comparisonQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Calculando...</p>
            </CardContent>
          </Card>
        ) : data?.hasEnoughData ? (
          <div className="space-y-6">
            {/* Como ler estes números */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Como ler estes números</h3>
                    <p className="text-sm text-blue-800">
                      Esta tela compara a média dos seus{" "}
                      <strong>últimos {data.recentSampleSize} registros</strong> com a média de{" "}
                      <strong>todos os seus {data.sampleSize} registros</strong>. São duas fotos do
                      passado, não uma projeção do que vai acontecer.
                    </p>
                    <p className="text-sm text-blue-800 mt-2">
                      Seu humor varia tipicamente <strong>±{data.variability?.toFixed(1)} pontos</strong>{" "}
                      em torno da média.{" "}
                      {(data.variability ?? 0) >= 2
                        ? "Como essa variação é grande, uma diferença pequena entre as duas médias pode ser apenas oscilação normal."
                        : "Como essa variação é pequena, suas médias são estáveis."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Humor e Ansiedade */}
            <div className="grid md:grid-cols-2 gap-6">
              {([
                {
                  label: "Humor",
                  recent: data.recentAverage!.mood,
                  historical: data.historicalAverage!.mood,
                  lowerIsBetter: false,
                  accent: "text-purple-600",
                  bar: "bg-purple-600",
                  barSoft: "bg-purple-200",
                },
                {
                  label: "Ansiedade",
                  recent: data.recentAverage!.anxiety,
                  historical: data.historicalAverage!.anxiety,
                  lowerIsBetter: true,
                  accent: "text-red-600",
                  bar: "bg-red-600",
                  barSoft: "bg-red-200",
                },
              ] as const).map((metric) => {
                const delta = describeDelta(metric.recent, metric.historical, metric.lowerIsBetter);
                const DeltaIcon = delta.icon;
                return (
                  <Card key={metric.label}>
                    <CardHeader>
                      <CardTitle>{metric.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                          Últimos {data.recentSampleSize} registros
                        </div>
                        <div className={`text-6xl font-bold mb-1 ${metric.accent}`}>
                          {metric.recent.toFixed(1)}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">de 10</div>

                        <div
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${delta.className}`}
                        >
                          <DeltaIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{delta.text}</span>
                        </div>
                      </div>

                      <div className="space-y-3 mt-4">
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Histórico completo ({data.sampleSize} registros)</span>
                            <span>{metric.historical.toFixed(1)}</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${metric.barSoft}`}
                              style={{ width: `${(metric.historical / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Últimos {data.recentSampleSize} registros</span>
                            <span>{metric.recent.toFixed(1)}</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${metric.bar}`}
                              style={{ width: `${(metric.recent / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4 font-medium">{data?.message}</p>
              <Link href="/mood">
                <Button>Registrar Humor</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Substitui o bloco antigo de "recomendações" que era fixo para
            todos os usuários. */}
        <div className="mt-8">
          <InsightSection title="O que fazer com isso" />
        </div>
      </main>
    </div>
  );
}
