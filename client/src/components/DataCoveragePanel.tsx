import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Lock } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { fusoDoUsuario } from "@/lib/timezone";
import { plural } from "@/lib/utils";

/**
 * "Quanto dado eu tenho e o que isso libera".
 *
 * As telas de análise já diziam, item a item, o que faltava para cada
 * cruzamento — mas a informação aparecia solta dentro de cada uma. Quem
 * abria as Análises e via pouca coisa não tinha como saber se faltavam
 * dois registros ou vinte, nem onde registrá-los.
 *
 * Aqui isso está reunido: quanto já existe em cada fonte, quais análises
 * já estão disponíveis e, para cada uma que ainda não está, o que
 * exatamente falta.
 */
export default function DataCoveragePanel() {
  const query = trpc.analytics.dataCoverage.useQuery({
    timezoneOffsetMinutes: fusoDoUsuario(),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600">Verificando seus registros...</p>
        </CardContent>
      </Card>
    );
  }

  const dados = query.data;
  if (!dados) return null;

  const { sources, analyses, totalRecords } = dados;

  return (
    <section className="space-y-4" aria-labelledby="cobertura-heading">
      <h2 id="cobertura-heading" className="text-2xl font-bold text-gray-900">
        Seus dados
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {analyses.available.length} de {analyses.total} análises disponíveis
          </CardTitle>
          <p className="text-sm text-gray-600">
            Você tem {plural(totalRecords, "registro", "registros")} no total. Cada análise
            precisa de uma quantidade mínima para que a média signifique alguma coisa.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quanto existe de cada fonte */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">O que você já registrou</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {sources.map((fonte) => (
                <Link key={fonte.id} href={fonte.route}>
                  <div className="flex justify-between items-center p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <span className="text-sm text-gray-700">{fonte.label}</span>
                    <span
                      className={
                        fonte.count > 0
                          ? "text-sm font-semibold text-gray-900"
                          : "text-sm font-semibold text-gray-400"
                      }
                    >
                      {fonte.count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Análises já disponíveis */}
          {analyses.available.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Já disponíveis</h3>
              <ul className="space-y-2">
                {analyses.available.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm text-gray-700">
                    <Check
                      className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      {a.label} — {plural(a.sampleSize, "registro", "registros")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* O que ainda falta */}
          {analyses.locked.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Ainda não disponíveis
              </h3>
              <ul className="space-y-3">
                {analyses.locked.map((a) => (
                  <li key={a.id} className="flex gap-2 text-sm">
                    <Lock
                      className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>
                      <span className="text-gray-900 font-medium">{a.label}</span>
                      <span className="block text-gray-600">{a.missing}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totalRecords === 0 && (
            <div className="pt-2">
              <Link href="/mood">
                <Button size="sm">Fazer o primeiro registro</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
