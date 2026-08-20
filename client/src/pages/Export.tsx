import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ArrowLeft, Download, FileText, FileJson } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

/** Rótulos legíveis para o terapeuta que vai receber o arquivo. */
const simbolosSintoma: Record<string, string> = {
  social_interaction: "Interação Social",
  communication: "Comunicação",
  repetitive_behavior: "Comportamento Repetitivo",
  sensory_sensitivity: "Sensibilidade Sensorial",
  focus: "Foco e Atenção",
  executive_function: "Função Executiva",
};

export default function Export() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [exportFormat, setExportFormat] = useState("json");
  const [dateRange, setDateRange] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const moodEntriesQuery = trpc.mood.list.useQuery();
  const triggersQuery = trpc.triggers.list.useQuery();
  const routinesQuery = trpc.routines.list.useQuery();
  const exercisesQuery = trpc.exercises.list.useQuery();
  const symptomsQuery = trpc.symptoms.list.useQuery();
  const techniqueAnalyticsQuery = trpc.techniques.getAnalytics.useQuery();
  const gameStatsQuery = trpc.gamification.getStats.useQuery();

  /**
   * Recorta uma lista pelo período escolhido.
   *
   * O seletor "Período" existia na tela e não filtrava nada: o estado era
   * lido em zero lugares e a exportação sempre saía completa, ignorando a
   * escolha. Cada fonte guarda a data num campo diferente, por isso a
   * função recebe qual usar.
   */
  const filtrarPorPeriodo = <T,>(itens: T[], campoData: keyof T): T[] => {
    if (dateRange === "all") return itens;

    const inicio = new Date();
    inicio.setDate(inicio.getDate() - (dateRange === "week" ? 7 : 30));

    return itens.filter((item) => {
      const valor = item[campoData];
      if (!valor) return false;
      return new Date(valor as unknown as string) >= inicio;
    });
  };

  const rotuloPeriodo =
    dateRange === "week" ? "Última semana" : dateRange === "month" ? "Último mês" : "Todos os dados";

  const coletar = () => ({
    moodEntries: filtrarPorPeriodo(moodEntriesQuery.data ?? [], "date"),
    sensoryTriggers: filtrarPorPeriodo(triggersQuery.data ?? [], "createdAt"),
    routines: filtrarPorPeriodo(routinesQuery.data ?? [], "createdAt"),
    exerciseSessions: filtrarPorPeriodo(exercisesQuery.data ?? [], "startedAt"),
    symptomEntries: filtrarPorPeriodo(symptomsQuery.data ?? [], "date"),
  });

  const exportData = () => {
    setIsExporting(true);

    try {
      const coletado = coletar();
      const data = {
        exportDate: new Date().toISOString(),
        periodo: rotuloPeriodo,
        user: {
          name: user?.name,
          email: user?.email,
        },
        ...coletado,
        // Não são séries temporais: são o retrato atual, exportado
        // inteiro independentemente do período.
        tecnicas: techniqueAnalyticsQuery.data ?? null,
        gamificacao: gameStatsQuery.data ?? null,
      };

      if (exportFormat === "json") {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `apoio-autismo-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "csv") {
        // Uma planilha só, com a origem na primeira coluna: quem abre no
        // Excel consegue filtrar por tipo sem precisar de vários arquivos.
        const csvRows: (string | number)[][] = [
          ["Tipo", "Data", "Campo1", "Campo2", "Campo3", "Campo4", "Observações"],
          ...coletado.moodEntries.map((e) => [
            "Humor",
            new Date(e.date).toLocaleDateString("pt-BR"),
            `Humor: ${e.moodLevel}/10`,
            `Ansiedade: ${e.anxietyLevel}/10`,
            `Estresse: ${e.stressLevel}/10`,
            `Energia: ${e.energyLevel}/10`,
            e.notes || "",
          ]),
          ...coletado.symptomEntries.map((e) => [
            "Sintoma",
            new Date(e.date).toLocaleDateString("pt-BR"),
            simbolosSintoma[e.symptomType] || e.symptomType,
            `Severidade: ${e.severity}/10`,
            e.duration ? `Duração: ${e.duration} min` : "",
            e.effectiveness ? `Efetividade: ${e.effectiveness}/10` : "",
            e.notes || "",
          ]),
          ...coletado.sensoryTriggers.map((t) => [
            "Gatilho",
            new Date(t.createdAt).toLocaleDateString("pt-BR"),
            t.name,
            `Categoria: ${t.category}`,
            `Severidade: ${t.severity}/10`,
            `Frequência: ${t.frequency}`,
            t.copingStrategy || "",
          ]),
          ...coletado.exerciseSessions.map((s) => [
            "Exercício",
            new Date(s.startedAt).toLocaleDateString("pt-BR"),
            s.exerciseType,
            `Duração: ${s.duration}s`,
            s.pattern ? `Padrão: ${s.pattern}` : "",
            s.rating ? `Avaliação: ${s.rating}/10` : "",
            s.notes || "",
          ]),
          ...coletado.routines.map((r) => [
            "Rotina",
            new Date(r.createdAt).toLocaleDateString("pt-BR"),
            r.title,
            `Período: ${r.timeOfDay}`,
            `Conclusões: ${r.totalCompletions}`,
            `Sequência: ${r.currentStreak} dias`,
            r.description || "",
          ]),
        ];

        const csvString = csvRows
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
          .join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `apoio-autismo-dados-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "txt") {
        let txtContent = `Relatório de Dados - Apoio Autismo\n`;
        txtContent += `Data de Exportação: ${new Date().toLocaleString("pt-BR")}\n`;
        txtContent += `Período: ${rotuloPeriodo}\n`;
        txtContent += `Usuário: ${user?.name || "Não informado"}\n\n`;

        txtContent += `=== ENTRADAS DE HUMOR (${coletado.moodEntries.length}) ===\n\n`;
        coletado.moodEntries.forEach(entry => {
          txtContent += `Data: ${new Date(entry.date).toLocaleString("pt-BR")}\n`;
          txtContent += `Humor: ${entry.moodLevel}/10 | Ansiedade: ${entry.anxietyLevel}/10 | Estresse: ${entry.stressLevel}/10 | Energia: ${entry.energyLevel}/10\n`;
          if (entry.triggers?.length) txtContent += `Gatilhos: ${entry.triggers.join(", ")}\n`;
          if (entry.notes) txtContent += `Notas: ${entry.notes}\n`;
          txtContent += `\n`;
        });

        txtContent += `\n=== SINTOMAS (${coletado.symptomEntries.length}) ===\n\n`;
        coletado.symptomEntries.forEach(entry => {
          txtContent += `Data: ${new Date(entry.date).toLocaleString("pt-BR")}\n`;
          txtContent += `Tipo: ${simbolosSintoma[entry.symptomType] || entry.symptomType} | Severidade: ${entry.severity}/10\n`;
          if (entry.duration) txtContent += `Duração: ${entry.duration} min\n`;
          if (entry.triggers?.length) txtContent += `Gatilhos: ${entry.triggers.join(", ")}\n`;
          if (entry.interventions?.length) {
            txtContent += `Intervenções: ${entry.interventions.join(", ")}`;
            txtContent += entry.effectiveness ? ` (efetividade ${entry.effectiveness}/10)\n` : `\n`;
          }
          if (entry.notes) txtContent += `Observações: ${entry.notes}\n`;
          txtContent += `\n`;
        });

        txtContent += `\n=== GATILHOS SENSORIAIS (${coletado.sensoryTriggers.length}) ===\n\n`;
        coletado.sensoryTriggers.forEach(trigger => {
          txtContent += `Nome: ${trigger.name}\n`;
          txtContent += `Categoria: ${trigger.category} | Severidade: ${trigger.severity}/10\n`;
          if (trigger.description) txtContent += `Descrição: ${trigger.description}\n`;
          if (trigger.copingStrategy) txtContent += `Estratégia: ${trigger.copingStrategy}\n`;
          txtContent += `\n`;
        });

        txtContent += `\n=== ROTINAS (${coletado.routines.length}) ===\n\n`;
        coletado.routines.forEach(routine => {
          txtContent += `${routine.title} (${routine.timeOfDay})\n`;
          txtContent += `Conclusões: ${routine.totalCompletions} | Sequência atual: ${routine.currentStreak} dias | Melhor: ${routine.longestStreak} dias\n\n`;
        });

        txtContent += `\n=== EXERCÍCIOS (${coletado.exerciseSessions.length}) ===\n\n`;
        coletado.exerciseSessions.forEach(s => {
          txtContent += `Data: ${new Date(s.startedAt).toLocaleString("pt-BR")}\n`;
          txtContent += `Tipo: ${s.exerciseType} | Duração: ${s.duration}s`;
          txtContent += s.rating ? ` | Avaliação: ${s.rating}/10\n` : `\n`;
          txtContent += `\n`;
        });

        const tecnicas = techniqueAnalyticsQuery.data;
        if (tecnicas && tecnicas.totalTechniquesUsed > 0) {
          txtContent += `\n=== TÉCNICAS DE AUTORREGULAÇÃO ===\n\n`;
          txtContent += `Técnicas utilizadas: ${tecnicas.totalTechniquesUsed} | Usos totais: ${tecnicas.totalUsageCount}\n`;
          if (tecnicas.averageEffectiveness != null) {
            txtContent += `Efetividade média: ${tecnicas.averageEffectiveness}/10\n`;
          }
          tecnicas.mostEffective.forEach(t => {
            txtContent += `- ${t.title}: efetividade ${t.effectiveness}/10, usada ${t.usageCount}x\n`;
          });
          txtContent += `\n`;
        }

        const stats = gameStatsQuery.data as
          | { level?: number; totalPoints?: number; currentStreak?: number; longestStreak?: number }
          | null
          | undefined;
        if (stats) {
          txtContent += `\n=== ENGAJAMENTO ===\n\n`;
          txtContent += `Nível ${stats.level ?? 1} | ${stats.totalPoints ?? 0} pontos\n`;
          txtContent += `Sequência atual: ${stats.currentStreak ?? 0} dias | Melhor sequência: ${stats.longestStreak ?? 0} dias\n\n`;
        }

        const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `apoio-autismo-relatorio-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success("Dados exportados com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar dados");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  // Conta o que realmente será exportado, já com o período aplicado —
  // antes o número mostrado ignorava o filtro tanto quanto a exportação.
  const selecionado = coletar();
  const totalEntries =
    selecionado.moodEntries.length +
    selecionado.symptomEntries.length +
    selecionado.sensoryTriggers.length +
    selecionado.routines.length +
    selecionado.exerciseSessions.length;

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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Exportar Dados</h1>
          </div>
          <p className="text-gray-600">Compartilhe seus dados com profissionais de saúde</p>
        </div>

        <div className="space-y-6">
          {/* Data Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo dos Dados</CardTitle>
              <p className="text-sm text-gray-600">Contagens já considerando o período escolhido.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Classes escritas por extenso de propósito: o Tailwind
                    varre o código em busca de nomes literais, e uma
                    classe montada em template (`bg-${cor}-50`) some do
                    bundle. */}
                {[
                  { rotulo: "Entradas de Humor", valor: selecionado.moodEntries.length, fundo: "bg-purple-50", texto: "text-purple-600" },
                  { rotulo: "Sintomas", valor: selecionado.symptomEntries.length, fundo: "bg-indigo-50", texto: "text-indigo-600" },
                  { rotulo: "Gatilhos", valor: selecionado.sensoryTriggers.length, fundo: "bg-green-50", texto: "text-green-600" },
                  { rotulo: "Rotinas", valor: selecionado.routines.length, fundo: "bg-blue-50", texto: "text-blue-600" },
                  { rotulo: "Exercícios", valor: selecionado.exerciseSessions.length, fundo: "bg-pink-50", texto: "text-pink-600" },
                ].map((item) => (
                  <div key={item.rotulo} className={`text-center p-4 rounded-lg ${item.fundo}`}>
                    <div className={`text-2xl font-bold ${item.texto}`}>{item.valor}</div>
                    <div className="text-sm text-gray-600">{item.rotulo}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Opções de Exportação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="format">Formato do Arquivo</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        JSON (Completo)
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        CSV (Planilha)
                      </div>
                    </SelectItem>
                    <SelectItem value="txt">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        TXT (Relatório)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-2">
                  {exportFormat === "json" && "Formato completo com todos os dados estruturados"}
                  {exportFormat === "csv" && "Formato compatível com Excel e Google Sheets"}
                  {exportFormat === "txt" && "Relatório em texto simples para leitura"}
                </p>
              </div>

              <div>
                <Label htmlFor="dateRange">Período</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="dateRange">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os dados</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Ao exportar, você receberá um arquivo contendo {totalEntries} registro(s)
                </p>
                <Button 
                  onClick={exportData} 
                  disabled={isExporting || totalEntries === 0}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {isExporting ? "Exportando..." : "Exportar Dados"}
                </Button>
                {totalEntries === 0 && (
                  <p className="text-sm text-orange-600">
                    Você ainda não possui dados para exportar
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="text-blue-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Privacidade e Segurança</h3>
                  <p className="text-sm text-blue-800">
                    Seus dados são exportados diretamente para o seu dispositivo. Nenhuma informação é enviada para servidores externos. 
                    Compartilhe apenas com profissionais de confiança.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
