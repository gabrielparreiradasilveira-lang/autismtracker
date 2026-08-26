import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, ArrowLeft, Search, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { plural } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

type Fonte = "diary" | "mood" | "symptom" | "routine" | "exercise";

/**
 * Rótulo e cor de cada origem. Escritos por extenso, sem template: o
 * Tailwind só mantém no CSS de produção as classes que encontra escritas
 * literalmente no código.
 */
const FONTES: { id: Fonte; label: string; badge: string }[] = [
  { id: "diary", label: "Diário", badge: "bg-indigo-100 text-indigo-700" },
  { id: "mood", label: "Humor", badge: "bg-purple-100 text-purple-700" },
  { id: "symptom", label: "Sintomas", badge: "bg-orange-100 text-orange-700" },
  { id: "routine", label: "Rotinas", badge: "bg-blue-100 text-blue-700" },
  { id: "exercise", label: "Respiração", badge: "bg-pink-100 text-pink-700" },
];

const PERIODOS: { label: string; days?: number }[] = [
  { label: "Tudo" },
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

export default function Diary() {
  const { user, isAuthenticated, loading } = useRequireAuth();

  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<number | undefined>(undefined);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [textoEditado, setTextoEditado] = useState("");

  const timelineQuery = trpc.diary.timeline.useQuery({
    days: periodo,
    search: busca || undefined,
    sources: fontes.length > 0 ? fontes : undefined,
  });

  const criar = trpc.diary.create.useMutation({
    onSuccess: () => {
      toast.success("Anotação salva!");
      setTexto("");
      timelineQuery.refetch();
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const atualizar = trpc.diary.update.useMutation({
    onSuccess: () => {
      toast.success("Anotação atualizada!");
      setEditandoId(null);
      timelineQuery.refetch();
    },
    onError: (e) => toast.error("Erro ao atualizar: " + e.message),
  });

  const remover = trpc.diary.delete.useMutation({
    onSuccess: () => {
      toast.success("Anotação removida!");
      timelineQuery.refetch();
    },
    onError: (e) => toast.error("Erro ao remover: " + e.message),
  });

  if (loading) return <PageLoader />;
  if (!isAuthenticated || !user) return null;

  const itens = timelineQuery.data ?? [];

  const alternarFonte = (id: Fonte) =>
    setFontes((atuais) =>
      atuais.includes(id) ? atuais.filter((f) => f !== id) : [...atuais, id]
    );

  const fonteDe = (id: string) => FONTES.find((f) => f.id === id)!;

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Diário</h1>
          </div>
          <p className="text-gray-600">
            Tudo que você anotou, em um lugar só: as observações que escreveu ao registrar
            humor, sintomas, rotinas e respiração, junto com as anotações avulsas do dia.
          </p>
        </div>

        {/* Nova anotação avulsa */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Nova anotação</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="texto" className="sr-only">
              Texto da anotação
            </Label>
            <Textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="O que você quer registrar hoje?"
              rows={4}
            />
            <Button
              className="mt-3"
              disabled={!texto.trim() || criar.isPending}
              onClick={() => criar.mutate({ content: texto.trim() })}
            >
              {criar.isPending ? "Salvando..." : "Salvar anotação"}
            </Button>
          </CardContent>
        </Card>

        {/* Busca e filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="busca">Buscar no diário</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="busca"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Uma palavra que você lembra ter escrito"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Período</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {PERIODOS.map((p) => (
                  <Button
                    key={p.label}
                    size="sm"
                    variant={periodo === p.days ? "default" : "outline"}
                    onClick={() => setPeriodo(p.days)}
                    aria-pressed={periodo === p.days}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">
                Origem {fontes.length === 0 && "(todas)"}
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {FONTES.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={fontes.includes(f.id) ? "default" : "outline"}
                    onClick={() => alternarFonte(f.id)}
                    aria-pressed={fontes.includes(f.id)}
                    aria-label={`Mostrar apenas anotações de ${f.label}`}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha do tempo */}
        {timelineQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Carregando...</p>
            </CardContent>
          </Card>
        ) : itens.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {plural(itens.length, "anotação encontrada", "anotações encontradas")}.
            </p>

            {itens.map((item) => {
              const fonte = fonteDe(item.source);
              const idNumerico = Number(item.id.split("-")[1]);
              const emEdicao = item.source === "diary" && editandoId === idNumerico;

              return (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`text-xs px-2 py-1 rounded ${fonte.badge}`}>
                        {fonte.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(item.date).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.context && (
                        <span className="text-xs text-gray-500">· {item.context}</span>
                      )}
                    </div>

                    {emEdicao ? (
                      <div className="space-y-3">
                        <Label htmlFor={`editar-${item.id}`} className="sr-only">
                          Editar anotação
                        </Label>
                        <Textarea
                          id={`editar-${item.id}`}
                          value={textoEditado}
                          onChange={(e) => setTextoEditado(e.target.value)}
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!textoEditado.trim() || atualizar.isPending}
                            onClick={() =>
                              atualizar.mutate({
                                id: idNumerico,
                                content: textoEditado.trim(),
                              })
                            }
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditandoId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {item.content}
                      </p>
                    )}

                    {!emEdicao && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.source === "diary" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Editar esta anotação do diário"
                              onClick={() => {
                                setEditandoId(idNumerico);
                                setTextoEditado(item.content);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Remover esta anotação do diário"
                              onClick={() => {
                                if (confirm("Remover esta anotação?")) {
                                  remover.mutate({ id: idNumerico });
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1 text-red-600" />
                              Remover
                            </Button>
                          </>
                        ) : (
                          // A anotação pertence ao registro que a originou;
                          // editar aqui separaria o texto do seu contexto.
                          <Link href={item.route}>
                            <Button variant="ghost" size="sm">
                              Abrir em {fonte.label}
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                {busca || fontes.length > 0 || periodo
                  ? "Nenhuma anotação corresponde a esses filtros."
                  : "Nenhuma anotação ainda. Escreva a primeira acima, ou preencha o campo de observações ao registrar humor, sintoma, rotina ou respiração — tudo aparece aqui."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
