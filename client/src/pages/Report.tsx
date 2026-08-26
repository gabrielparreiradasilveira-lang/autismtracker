import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowLeft, Printer, Info } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fusoDoUsuario } from "@/lib/timezone";
import { plural } from "@/lib/utils";
import { useState } from "react";

const PERIODOS = [30, 90, 180] as const;

const SINTOMAS: Record<string, string> = {
  social_interaction: "Interação Social",
  communication: "Comunicação",
  repetitive_behavior: "Comportamento Repetitivo",
  sensory_sensitivity: "Sensibilidade Sensorial",
  focus: "Foco e Atenção",
  executive_function: "Função Executiva",
};

const CATEGORIAS: Record<string, string> = {
  sound: "Som",
  light: "Luz",
  texture: "Textura",
  smell: "Cheiro",
  taste: "Sabor",
  visual: "Visual",
  other: "Outro",
};

const data = (d: Date | string) => new Date(d).toLocaleDateString("pt-BR");

/**
 * Relatório para levar ao profissional.
 *
 * O app já mostrava todos esses números, cada um na sua tela. Quem vai a
 * uma consulta precisava abrir sete telas e anotar. Aqui está tudo num
 * documento imprimível, de um período declarado.
 *
 * A seção de limites vem antes dos dados de propósito: quem lê é alguém
 * que não acompanhou como o dado foi coletado, e precisa saber que são
 * autorrelatos, que médias com amostra pequena dizem pouco, e que
 * associação entre dois números não é causa.
 */
export default function Report() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [dias, setDias] = useState<number>(90);

  const query = trpc.report.summary.useQuery({
    days: dias,
    timezoneOffsetMinutes: fusoDoUsuario(),
  });

  if (loading) return <PageLoader />;
  if (!isAuthenticated || !user) return null;

  const r = query.data;

  return (
    <div className="min-h-screen bg-gray-50 imprimivel">
      <header className="bg-white border-b border-gray-200 nao-imprimir">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <Button size="sm" onClick={() => window.print()} disabled={!r}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir ou salvar em PDF
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center nao-imprimir">
              <FileText className="w-6 h-6 text-teal-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Relatório de acompanhamento
            </h1>
          </div>
          {r && (
            <p className="text-gray-600">
              {r.user.name || "Sem nome informado"} · período de {data(r.period.from)} a{" "}
              {data(r.period.to)} ({r.period.days} dias) · gerado em{" "}
              {new Date(r.period.generatedAt).toLocaleString("pt-BR")}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4 nao-imprimir">
            <span className="text-sm text-gray-700">Período:</span>
            {PERIODOS.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={dias === d ? "default" : "outline"}
                onClick={() => setDias(d)}
                aria-pressed={dias === d}
                aria-label={`Gerar o relatório dos últimos ${d} dias`}
              >
                {d} dias
              </Button>
            ))}
          </div>
        </div>

        {/* Limites — antes dos números, de propósito. */}
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="w-6 h-6 text-amber-700 flex-shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-semibold text-amber-900 mb-2">
                  Como ler este relatório
                </h2>
                <ul className="text-sm text-amber-900 space-y-1 list-disc pl-5">
                  <li>
                    Todos os números são <strong>autorrelatos</strong> registrados pela própria
                    pessoa no aplicativo. Não são medições clínicas.
                  </li>
                  <li>
                    Cada média vem com o número de registros que a formou. Média de poucos
                    registros descreve pouco.
                  </li>
                  <li>
                    Quando dois números aparecem associados (por exemplo, humor mais baixo em
                    dias com determinado gatilho), isso é uma associação observada nos
                    registros, <strong>não uma relação de causa</strong>.
                  </li>
                  <li>
                    Este documento <strong>não é um diagnóstico</strong> nem substitui avaliação
                    profissional.
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {query.isLoading || !r ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Montando o relatório...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* O que foi registrado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">O que foi registrado no período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registros de humor</span>
                    <span className="font-semibold">{r.counts.mood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Registros de sintoma</span>
                    <span className="font-semibold">{r.counts.symptoms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sessões de respiração</span>
                    <span className="font-semibold">{r.counts.exercises}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Técnicas utilizadas</span>
                    <span className="font-semibold">{r.counts.techniques}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gatilhos cadastrados</span>
                    <span className="font-semibold">{r.counts.triggers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Humor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Humor e estados relacionados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.mood.sampleSize === 0 ? (
                  <p className="text-gray-600">Nenhum registro de humor neste período.</p>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Humor médio</span>
                        <span className="font-semibold">{r.mood.average}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ansiedade média</span>
                        <span className="font-semibold">{r.mood.anxiety}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estresse médio</span>
                        <span className="font-semibold">{r.mood.stress}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Energia média</span>
                        <span className="font-semibold">{r.mood.energy}/10</span>
                      </div>
                    </div>
                    <p className="text-gray-600">
                      Baseado em {plural(r.mood.sampleSize, "registro", "registros")}.
                      {r.mood.variability != null && (
                        <>
                          {" "}
                          O humor varia tipicamente ±{r.mood.variability} pontos em torno da
                          média
                          {r.mood.variability >= 2
                            ? " — variação alta, então a média resume pouco."
                            : " — variação baixa, então a média é representativa."}
                        </>
                      )}
                    </p>

                    {r.mood.byTimeOfDay.length > 0 && (
                      <div className="pt-2">
                        <p className="font-medium text-gray-800 mb-1">Por período do dia</p>
                        {r.mood.byTimeOfDay.map((f) => (
                          <div key={f.timeOfDay} className="flex justify-between">
                            <span className="text-gray-600">{f.label}</span>
                            <span>
                              humor {f.averageMood}/10, ansiedade {f.averageAnxiety}/10 (
                              {plural(f.count, "registro", "registros")})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Sintomas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sintomas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.symptoms.averageSeverityByType.length === 0 ? (
                  <p className="text-gray-600">Nenhum registro de sintoma neste período.</p>
                ) : (
                  <>
                    <div>
                      <p className="font-medium text-gray-800 mb-1">Severidade média por tipo</p>
                      {r.symptoms.averageSeverityByType.map((s) => {
                        const dur = r.symptoms.durationBySymptomType.find(
                          (d) => d.symptomType === s.symptomType
                        );
                        const ef = r.symptoms.effectivenessBySymptomType.find(
                          (e) => e.symptomType === s.symptomType
                        );
                        return (
                          <div key={s.symptomType} className="flex justify-between gap-3">
                            <span className="text-gray-600">
                              {SINTOMAS[s.symptomType] || s.symptomType}
                            </span>
                            <span className="text-right">
                              {s.averageSeverity}/10 ({plural(s.count, "registro", "registros")})
                              {dur && ` · duração média ${dur.averageDuration} min`}
                              {ef && ` · intervenções ${ef.averageEffectiveness}/10`}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {r.symptoms.topTriggers.length > 0 && (
                      <div className="pt-2">
                        <p className="font-medium text-gray-800 mb-1">
                          Gatilhos mais registrados junto de sintomas
                        </p>
                        {r.symptoms.topTriggers.map((t) => (
                          <div key={t.trigger} className="flex justify-between gap-3">
                            <span className="text-gray-600">{t.trigger}</span>
                            <span>
                              {plural(t.count, "vez", "vezes")} · severidade média{" "}
                              {t.averageSeverity}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.symptoms.moodCorrelation.hasSufficientData && (
                      <p className="text-gray-700 pt-2">
                        Humor médio em dias com sintoma severo (7 ou mais):{" "}
                        {r.symptoms.moodCorrelation.avgMoodHighSeverity ?? "—"} (
                        {plural(r.symptoms.moodCorrelation.highSeverityDayCount, "dia", "dias")}).
                        Em dias com sintoma leve:{" "}
                        {r.symptoms.moodCorrelation.avgMoodLowSeverity ?? "—"} (
                        {plural(r.symptoms.moodCorrelation.lowSeverityDayCount, "dia", "dias")}).
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rotinas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rotinas</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {r.routines.hasSufficientData &&
                r.routines.avgMoodWithRoutines != null &&
                r.routines.avgMoodWithoutRoutines != null ? (
                  <p className="text-gray-700">
                    Nos {plural(r.routines.daysWithRoutines, "dia", "dias")} com alguma rotina
                    concluída, o humor médio foi {r.routines.avgMoodWithRoutines}. Nos{" "}
                    {plural(r.routines.daysWithoutRoutines, "dia", "dias")} sem rotina concluída,
                    foi {r.routines.avgMoodWithoutRoutines}. Análise dos últimos 30 dias, sobre{" "}
                    {plural(r.routines.daysAnalyzed, "dia", "dias")} com humor registrado.
                  </p>
                ) : (
                  <p className="text-gray-600">
                    Ainda não há dias suficientes com rotina e humor registrados no mesmo dia
                    para comparar.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Autorregulação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estratégias de autorregulação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {r.breathing.byPattern.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Exercícios de respiração</p>
                    {r.breathing.byPattern.map((p) => (
                      <div key={p.pattern} className="flex justify-between gap-3">
                        <span className="text-gray-600">Padrão {p.pattern}</span>
                        <span>
                          {plural(p.sessions, "sessão", "sessões")}
                          {p.averageRating != null
                            ? ` · avaliada ${p.averageRating}/10 em ${p.ratedSessions}`
                            : " · nenhuma avaliada"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {r.techniques.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Técnicas mais bem avaliadas</p>
                    {r.techniques.map((t) => (
                      <div key={t.id} className="flex justify-between gap-3">
                        <span className="text-gray-600">{t.title}</span>
                        <span>
                          efetividade {t.effectiveness}/10 · usada {t.usageCount}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {r.registeredTriggers.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-800 mb-1">
                      Gatilhos cadastrados e estratégias já em uso
                    </p>
                    {r.registeredTriggers.map((g) => (
                      <div key={g.name} className="py-1">
                        <span className="text-gray-800">
                          {g.name} ({CATEGORIAS[g.category] || g.category}, severidade{" "}
                          {g.severity}/10)
                        </span>
                        {g.copingStrategy && (
                          <span className="block text-gray-600">
                            Estratégia: {g.copingStrategy}
                          </span>
                        )}
                        {g.lastOccurred && (
                          <span className="block text-gray-500 text-xs">
                            Última ocorrência registrada: {data(g.lastOccurred)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {r.breathing.byPattern.length === 0 &&
                  r.techniques.length === 0 &&
                  r.registeredTriggers.length === 0 && (
                    <p className="text-gray-600">
                      Nenhuma estratégia de autorregulação registrada até agora.
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Padrões observados */}
            {r.insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Padrões observados nos registros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {r.insights.map((i) => (
                    <div key={i.id}>
                      <p className="text-gray-900 font-medium">{i.pattern}</p>
                      <p className="text-gray-600">{i.meaning}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        Baseado em {plural(i.sampleSize, "registro", "registros")}.
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-gray-500">
              Documento gerado pelo aplicativo Apoio Autismo a partir dos registros feitos pela
              própria pessoa. Não constitui diagnóstico nem avaliação clínica.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
