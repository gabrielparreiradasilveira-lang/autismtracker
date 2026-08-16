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

export default function Export() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [exportFormat, setExportFormat] = useState("json");
  const [dateRange, setDateRange] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  const moodEntriesQuery = trpc.mood.list.useQuery();
  const triggersQuery = trpc.triggers.list.useQuery();
  const routinesQuery = trpc.routines.list.useQuery();
  const exercisesQuery = trpc.exercises.list.useQuery();

  const exportData = () => {
    setIsExporting(true);

    try {
      const data = {
        exportDate: new Date().toISOString(),
        user: {
          name: user?.name,
          email: user?.email,
        },
        moodEntries: moodEntriesQuery.data || [],
        sensoryTriggers: triggersQuery.data || [],
        routines: routinesQuery.data || [],
        exerciseSessions: exercisesQuery.data || [],
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
        // Export mood entries as CSV
        const csvRows = [
          ["Data", "Humor", "Ansiedade", "Estresse", "Energia", "Notas"],
          ...(moodEntriesQuery.data || []).map(entry => [
            new Date(entry.date).toLocaleDateString("pt-BR"),
            entry.moodLevel,
            entry.anxietyLevel,
            entry.stressLevel,
            entry.energyLevel,
            entry.notes || "",
          ]),
        ];
        
        const csvString = csvRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `apoio-autismo-humor-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (exportFormat === "txt") {
        let txtContent = `Relatório de Dados - Apoio Autismo\n`;
        txtContent += `Data de Exportação: ${new Date().toLocaleString("pt-BR")}\n`;
        txtContent += `Usuário: ${user?.name || "Não informado"}\n\n`;
        
        txtContent += `=== ENTRADAS DE HUMOR ===\n\n`;
        (moodEntriesQuery.data || []).forEach(entry => {
          txtContent += `Data: ${new Date(entry.date).toLocaleString("pt-BR")}\n`;
          txtContent += `Humor: ${entry.moodLevel}/10 | Ansiedade: ${entry.anxietyLevel}/10 | Estresse: ${entry.stressLevel}/10 | Energia: ${entry.energyLevel}/10\n`;
          if (entry.notes) txtContent += `Notas: ${entry.notes}\n`;
          txtContent += `\n`;
        });

        txtContent += `\n=== GATILHOS SENSORIAIS ===\n\n`;
        (triggersQuery.data || []).forEach(trigger => {
          txtContent += `Nome: ${trigger.name}\n`;
          txtContent += `Categoria: ${trigger.category} | Severidade: ${trigger.severity}/10\n`;
          if (trigger.description) txtContent += `Descrição: ${trigger.description}\n`;
          if (trigger.copingStrategy) txtContent += `Estratégia: ${trigger.copingStrategy}\n`;
          txtContent += `\n`;
        });

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

  const totalEntries = 
    (moodEntriesQuery.data?.length || 0) +
    (triggersQuery.data?.length || 0) +
    (routinesQuery.data?.length || 0) +
    (exercisesQuery.data?.length || 0);

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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {moodEntriesQuery.data?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Entradas de Humor</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {triggersQuery.data?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Gatilhos</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {routinesQuery.data?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Rotinas</div>
                </div>
                <div className="text-center p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-600">
                    {exercisesQuery.data?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Exercícios</div>
                </div>
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
