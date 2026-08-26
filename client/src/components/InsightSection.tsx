import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Plus } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fusoDoUsuario } from "@/lib/timezone";

/**
 * Insights acionáveis, no formato padrão / significado / ação.
 *
 * Quando um cruzamento ainda não tem dados suficientes, mostramos
 * exatamente o que falta em números, em vez de um conselho genérico que
 * serviria para qualquer pessoa.
 */
export default function InsightSection({
  title = "O que seus dados mostram",
  // Na tela de Análises o que falta é mostrado pelo painel de cobertura,
  // com muito mais detalhe; repetir aqui seria a mesma lista duas vezes.
  showMissing = true,
}: {
  title?: string;
  showMissing?: boolean;
}) {
  const query = trpc.analytics.insights.useQuery({ timezoneOffsetMinutes: fusoDoUsuario() });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600">Analisando seus registros...</p>
        </CardContent>
      </Card>
    );
  }

  // Erro tratado à parte: antes ele caía no mesmo `return null` da
  // ausência de dados, então falha de rede virava seção inexistente —
  // indistinguível de "não há nada para mostrar".
  if (query.isError) {
    return (
      <section className="space-y-4" aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="text-2xl font-bold text-gray-900">
          {title}
        </h2>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              Não foi possível carregar suas análises agora. Seus registros estão salvos — o que
              falhou foi a leitura.
            </p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => query.refetch()}>
              Tentar de novo
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  const insights = query.data?.insights ?? [];
  const missing = query.data?.missing ?? [];

  // Sem nenhum insight e sem a lista do que falta (que nesta tela mora no
  // painel de cobertura), a seção sumia inteira e a pessoa não tinha como
  // saber se era falta de dado ou defeito. Agora diz para onde olhar.
  if (insights.length === 0 && !showMissing) {
    return (
      <section className="space-y-4" aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="text-2xl font-bold text-gray-900">
          {title}
        </h2>
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-700">
              Nenhum padrão tem amostra suficiente ainda. O quadro abaixo mostra quanto você já
              registrou e o que falta para cada análise.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (insights.length === 0 && missing.length === 0) return null;

  return (
    <section className="space-y-4" aria-labelledby="insights-heading">
      <h2 id="insights-heading" className="text-2xl font-bold text-gray-900">
        {title}
      </h2>

      {insights.map((insight) => (
        <Card key={insight.id} className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm text-gray-900 font-medium">{insight.pattern}</p>
                <p className="text-sm text-gray-600 mt-2">{insight.meaning}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={insight.action.route}>
                    <Button size="sm">{insight.action.label}</Button>
                  </Link>
                  <span className="text-xs text-gray-500">
                    Baseado em {insight.sampleSize}{" "}
                    {insight.sampleSize === 1 ? "registro" : "registros"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {showMissing && missing.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Para desbloquear mais análises
            </h3>
            <ul className="space-y-2">
              {missing.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm text-gray-700">
                  <Plus className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item.missing}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
