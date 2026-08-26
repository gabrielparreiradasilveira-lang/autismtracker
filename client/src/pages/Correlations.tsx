import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import InsightSection from "@/components/InsightSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, ArrowLeft, AlertCircle, CheckCircle, Info } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fusoDoUsuario } from "@/lib/timezone";
import { plural } from "@/lib/utils";

/** Mesmos rótulos usados na tela de Gatilhos. */
const categoriaDeGatilho: Record<string, string> = {
  sound: "Som",
  light: "Luz",
  texture: "Textura",
  smell: "Cheiro",
  taste: "Sabor",
  visual: "Visual",
  other: "Outro",
};

export default function Correlations() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  
  const correlationsQuery = trpc.analytics.correlations.useQuery();
  const symptomCorrelationQuery = trpc.symptoms.getMoodCorrelation.useQuery({ days: 30, timezoneOffsetMinutes: fusoDoUsuario() });

  if (loading) return <PageLoader />;


  if (!isAuthenticated || !user) return null;

  const data = correlationsQuery.data;
  const correlations = data?.correlations || [];

  // Sort by impact (lower mood = higher impact)
  const sortedCorrelations = [...correlations].sort((a, b) => a.avgMood - b.avgMood);

  const getImpactLevel = (avgMood: number) => {
    if (avgMood <= 4) return { level: "Alto", color: "red", icon: AlertCircle };
    if (avgMood <= 6) return { level: "Moderado", color: "yellow", icon: Info };
    return { level: "Baixo", color: "green", icon: CheckCircle };
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Correlações e Insights</h1>
          </div>
          <p className="text-gray-600">Entenda como gatilhos afetam seu bem-estar</p>
        </div>

        <div className="mb-8">
          <InsightSection />
        </div>

        {correlationsQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Analisando correlações...</p>
            </CardContent>
          </Card>
        ) : sortedCorrelations.length > 0 ? (
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Como Interpretar</h3>
                    <p className="text-sm text-blue-800">
                      Para cada gatilho, comparamos a média do seu humor e da sua ansiedade nos dias em
                      que você o registrou. Um gatilho de <strong>impacto alto</strong> é aquele
                      associado às suas médias de humor mais baixas — o que não significa que ele seja
                      a causa. Só entram gatilhos registrados em pelo menos 3 dias.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Correlations List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Impacto dos Gatilhos</h2>
              
              {sortedCorrelations.map((correlation, index) => {
                const impact = getImpactLevel(correlation.avgMood);
                const ImpactIcon = impact.icon;
                
                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{correlation.trigger}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                              impact.color === 'red' ? 'bg-red-100 text-red-700' :
                              impact.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              <ImpactIcon className="w-3 h-3" />
                              Impacto {impact.level}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {correlation.occurrences} ocorrência{correlation.occurrences !== 1 ? 's' : ''}
                            </span>
                            {correlation.registered && (
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {categoriaDeGatilho[correlation.registered.category] ||
                                  correlation.registered.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Humor Médio</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${(correlation.avgMood / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">
                              {correlation.avgMood.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Ansiedade Média</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-red-600 h-2 rounded-full transition-all"
                                style={{ width: `${(correlation.avgAnxiety / 10) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">
                              {correlation.avgAnxiety.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          {/* "associado a", nunca "causa": estes números vêm
                              de médias, não de uma relação causal. */}
                          {impact.level === "Alto" && (
                            <>
                              <strong>Atenção:</strong> nos dias em que você registrou este gatilho, seu
                              humor médio foi {correlation.avgMood.toFixed(1)} de 10 — o grupo mais baixo
                              dos seus registros. Ter uma estratégia preparada para ele pode ajudar.
                            </>
                          )}
                          {impact.level === "Moderado" && (
                            <>
                              <strong>Observação:</strong> nos dias com este gatilho, seu humor médio foi{" "}
                              {correlation.avgMood.toFixed(1)} de 10. Praticar uma técnica de
                              autorregulação quando ele ocorrer pode ajudar.
                            </>
                          )}
                          {impact.level === "Baixo" && (
                            <>
                              <strong>Observação:</strong> nos dias com este gatilho, seu humor médio foi{" "}
                              {correlation.avgMood.toFixed(1)} de 10 — próximo dos seus melhores
                              registros. Não aparece associado a piora até agora.
                            </>
                          )}
                        </p>
                      </div>

                      {/* A estratégia que a pessoa já escreveu para este
                          gatilho mora na tela de Gatilhos e nunca aparecia
                          aqui — bem no lugar em que ela é necessária. */}
                      {correlation.registered?.copingStrategy ? (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-900">
                            <strong>Sua estratégia para este gatilho:</strong>{" "}
                            {correlation.registered.copingStrategy}
                          </p>
                        </div>
                      ) : impact.level !== "Baixo" ? (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm text-amber-900">
                            Você ainda não escreveu uma estratégia de enfrentamento para
                            este gatilho.{" "}
                            <Link href="/triggers">
                              <span className="underline cursor-pointer">
                                {correlation.registered
                                  ? "Adicionar estratégia"
                                  : "Cadastrar este gatilho"}
                              </span>
                            </Link>
                            .
                          </p>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Gatilhos ainda sem amostra suficiente */}
            {data && data.insufficientSample.count > 0 && (
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-700">
                    <strong>{data.insufficientSample.count} gatilho(s)</strong> ainda não aparecem na
                    lista acima: {data.insufficientSample.triggers.join(", ")}. É preciso registrá-los
                    em pelo menos {data.insufficientSample.minOccurrences} dias para que a média
                    signifique algo.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Gatilhos Analisados</span>
                  <span className="font-semibold">{sortedCorrelations.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gatilhos de Alto Impacto</span>
                  <span className="font-semibold text-red-600">
                    {sortedCorrelations.filter(c => c.avgMood <= 4).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gatilhos de Impacto Moderado</span>
                  <span className="font-semibold text-yellow-600">
                    {sortedCorrelations.filter(c => c.avgMood > 4 && c.avgMood <= 6).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gatilhos de Baixo Impacto</span>
                  <span className="font-semibold text-green-600">
                    {sortedCorrelations.filter(c => c.avgMood > 6).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Action Card */}
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <GitBranch className="w-6 h-6 text-purple-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-2">Próximos Passos</h3>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Revise seus gatilhos de alto impacto e desenvolva estratégias de enfrentamento</li>
                      <li>• Pratique exercícios de respiração quando identificar gatilhos</li>
                      <li>• Compartilhe esta análise com profissionais de saúde para orientação personalizada</li>
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <Link href="/triggers">
                        <Button size="sm">Gerenciar Gatilhos</Button>
                      </Link>
                      <Link href="/breathing">
                        <Button size="sm" variant="outline">Exercícios de Respiração</Button>
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
              <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                Nenhum gatilho foi registrado em pelo menos 3 entradas de humor ainda. Ao registrar
                seu humor, marque os gatilhos daquele dia para que esta comparação apareça.
              </p>
              <Link href="/mood">
                <Button>Registrar Humor</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Symptom <-> Mood Correlation */}
        {symptomCorrelationQuery.data?.hasSufficientData && (
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-semibold">Sintomas × Humor</h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-gray-600">
                  Humor médio em dias com sintomas intensos vs. leves
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Dias com sintoma severo (≥7/10) — {plural(symptomCorrelationQuery.data.highSeverityDayCount, "dia", "dias")}
                    </div>
                    <div className="text-3xl font-bold text-red-600">
                      {symptomCorrelationQuery.data.avgMoodHighSeverity ?? "—"}
                      {symptomCorrelationQuery.data.avgMoodHighSeverity != null && (
                        <span className="text-sm font-normal text-gray-500">/10</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">
                      Dias com sintoma leve (&lt;7/10) — {plural(symptomCorrelationQuery.data.lowSeverityDayCount, "dia", "dias")}
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {symptomCorrelationQuery.data.avgMoodLowSeverity ?? "—"}
                      {symptomCorrelationQuery.data.avgMoodLowSeverity != null && (
                        <span className="text-sm font-normal text-gray-500">/10</span>
                      )}
                    </div>
                  </div>
                </div>
                {symptomCorrelationQuery.data.avgMoodHighSeverity != null &&
                  symptomCorrelationQuery.data.avgMoodLowSeverity != null && (
                    <p className="text-sm text-gray-700 mt-4 p-3 bg-gray-50 rounded-lg">
                      {symptomCorrelationQuery.data.avgMoodHighSeverity <
                      symptomCorrelationQuery.data.avgMoodLowSeverity - 1
                        ? "Seu humor tende a cair em dias com sintomas mais intensos. Considere priorizar intervenções nesses dias."
                        : "Não há uma queda clara de humor associada a sintomas mais intensos até agora."}
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
