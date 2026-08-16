import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowLeft, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Predictions() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  
  const predictionsQuery = trpc.analytics.predictions.useQuery();
  const patternsQuery = trpc.analytics.patterns.useQuery();

  if (loading) return <PageLoader />;


  if (!isAuthenticated || !user) return null;

  const predictions = predictionsQuery.data;
  const patterns = patternsQuery.data;

  const getMoodTrend = (predicted: number | null, current: number) => {
    if (!predicted) return null;
    const diff = predicted - current;
    if (Math.abs(diff) < 0.5) return { direction: "stable", text: "Estável", color: "blue" };
    if (diff > 0) return { direction: "up", text: "Melhora", color: "green" };
    return { direction: "down", text: "Declínio", color: "red" };
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 80) return { level: "Alta", color: "green" };
    if (confidence >= 50) return { level: "Média", color: "yellow" };
    return { level: "Baixa", color: "red" };
  };

  const moodTrend = predictions?.predictedMood && patterns?.averages.mood
    ? getMoodTrend(predictions.predictedMood, patterns.averages.mood)
    : null;

  const confidenceInfo = predictions ? getConfidenceLevel(predictions.confidence) : null;

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
          <p className="text-gray-600">Antecipe padrões e planeje seu bem-estar</p>
        </div>

        {predictionsQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Gerando previsões...</p>
            </CardContent>
          </Card>
        ) : predictions && predictions.predictedMood !== null ? (
          <div className="space-y-6">
            {/* Confidence Indicator */}
            <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Confiança da Previsão
                    </h3>
                    <p className="text-sm text-gray-600">{predictions.message}</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      confidenceInfo?.color === 'green' ? 'text-green-600' :
                      confidenceInfo?.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(predictions.confidence)}%
                    </div>
                    <div className={`text-sm font-medium ${
                      confidenceInfo?.color === 'green' ? 'text-green-700' :
                      confidenceInfo?.color === 'yellow' ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {confidenceInfo?.level}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Predictions */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Previsão de Humor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-6xl font-bold text-purple-600 mb-2">
                      {predictions.predictedMood.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">de 10</div>
                    
                    {moodTrend && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                        moodTrend.color === 'green' ? 'bg-green-100 text-green-700' :
                        moodTrend.color === 'red' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {moodTrend.direction === "up" && <TrendingUp className="w-4 h-4" />}
                        {moodTrend.direction === "down" && <AlertTriangle className="w-4 h-4" />}
                        {moodTrend.direction === "stable" && <Info className="w-4 h-4" />}
                        <span className="text-sm font-medium">{moodTrend.text}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {predictions.predictedMood >= 7 ? (
                        <>
                          <strong>Previsão Positiva:</strong> Seu humor tende a se manter elevado. 
                          Continue com suas práticas atuais de bem-estar.
                        </>
                      ) : predictions.predictedMood >= 5 ? (
                        <>
                          <strong>Previsão Moderada:</strong> Seu humor pode oscilar. 
                          Considere praticar exercícios de respiração preventivamente.
                        </>
                      ) : (
                        <>
                          <strong>Atenção Necessária:</strong> Tendência de humor mais baixo. 
                          Planeje atividades de autocuidado e considere apoio profissional.
                        </>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-600" />
                    Previsão de Ansiedade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="text-6xl font-bold text-red-600 mb-2">
                      {predictions.predictedAnxiety.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">de 10</div>
                    
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${
                      predictions.predictedAnxiety <= 4 ? 'bg-green-100 text-green-700' :
                      predictions.predictedAnxiety <= 6 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    } rounded-full`}>
                      {predictions.predictedAnxiety <= 4 ? (
                        <><Info className="w-4 h-4" /><span className="text-sm font-medium">Controlada</span></>
                      ) : predictions.predictedAnxiety <= 6 ? (
                        <><Info className="w-4 h-4" /><span className="text-sm font-medium">Moderada</span></>
                      ) : (
                        <><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">Elevada</span></>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {predictions.predictedAnxiety <= 4 ? (
                        <>
                          <strong>Situação Favorável:</strong> Níveis de ansiedade tendem a permanecer controlados. 
                          Mantenha suas rotinas de relaxamento.
                        </>
                      ) : predictions.predictedAnxiety <= 6 ? (
                        <>
                          <strong>Monitoramento Recomendado:</strong> Ansiedade pode aumentar. 
                          Pratique técnicas de respiração e evite gatilhos conhecidos.
                        </>
                      ) : (
                        <>
                          <strong>Ação Preventiva:</strong> Tendência de ansiedade elevada. 
                          Priorize exercícios de autorregulação e considere ajustar sua rotina.
                        </>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current vs Predicted */}
            {patterns && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparação: Atual vs Previsto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Humor</span>
                        <span>Atual: {patterns.averages.mood.toFixed(1)} → Previsto: {predictions.predictedMood.toFixed(1)}</span>
                      </div>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-purple-300 transition-all"
                          style={{ width: `${(patterns.averages.mood / 10) * 100}%` }}
                        />
                        <div 
                          className="absolute h-full bg-purple-600 transition-all opacity-70"
                          style={{ width: `${(predictions.predictedMood / 10) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Ansiedade</span>
                        <span>Atual: {patterns.averages.anxiety.toFixed(1)} → Previsto: {predictions.predictedAnxiety.toFixed(1)}</span>
                      </div>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-red-300 transition-all"
                          style={{ width: `${(patterns.averages.anxiety / 10) * 100}%` }}
                        />
                        <div 
                          className="absolute h-full bg-red-600 transition-all opacity-70"
                          style={{ width: `${(predictions.predictedAnxiety / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-indigo-900 mb-2">Recomendações Baseadas em Previsões</h3>
                    <ul className="text-sm text-indigo-800 space-y-2">
                      {predictions.predictedMood < 5 && (
                        <li>• <strong>Priorize autocuidado:</strong> Reserve tempo para atividades que você gosta</li>
                      )}
                      {predictions.predictedAnxiety > 6 && (
                        <li>• <strong>Pratique exercícios de respiração:</strong> Dedique 10 minutos diários para técnicas de relaxamento</li>
                      )}
                      <li>• <strong>Mantenha registros consistentes:</strong> Quanto mais dados, mais precisas as previsões</li>
                      <li>• <strong>Revise seus gatilhos:</strong> Identifique e evite situações que impactam negativamente</li>
                      <li>• <strong>Estabeleça rotinas:</strong> Estrutura ajuda a manter estabilidade emocional</li>
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <Link href="/breathing">
                        <Button size="sm">Exercícios de Respiração</Button>
                      </Link>
                      <Link href="/routines">
                        <Button size="sm" variant="outline">Gerenciar Rotinas</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2 font-medium">
                {predictions?.message || "Dados insuficientes para previsões"}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Continue registrando seu humor diariamente. São necessários pelo menos 7 registros 
                para gerar previsões confiáveis.
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
