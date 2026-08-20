import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import TriggerInput from "@/components/TriggerInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClipboardList, ArrowLeft, Trash2, Plus, Pencil } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SymptomType =
  | "social_interaction"
  | "communication"
  | "repetitive_behavior"
  | "sensory_sensitivity"
  | "focus"
  | "executive_function";

const symptomLabels: Record<SymptomType, string> = {
  social_interaction: "Interação Social",
  communication: "Comunicação",
  repetitive_behavior: "Comportamento Repetitivo",
  sensory_sensitivity: "Sensibilidade Sensorial",
  focus: "Foco e Atenção",
  executive_function: "Função Executiva",
};

const symptomColors: Record<SymptomType, string> = {
  social_interaction: "bg-blue-100 text-blue-700",
  communication: "bg-green-100 text-green-700",
  repetitive_behavior: "bg-orange-100 text-orange-700",
  sensory_sensitivity: "bg-yellow-100 text-yellow-700",
  focus: "bg-purple-100 text-purple-700",
  executive_function: "bg-red-100 text-red-700",
};

export default function Symptoms() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  // null = criando; número = editando aquele registro. O mesmo formulário
  // atende os dois casos.
  const [editingId, setEditingId] = useState<number | null>(null);

  const [symptomType, setSymptomType] = useState<SymptomType>("focus");
  const [severity, setSeverity] = useState([5]);
  const [duration, setDuration] = useState("");
  const [triggersText, setTriggersText] = useState("");
  const [interventionsText, setInterventionsText] = useState("");
  const [effectiveness, setEffectiveness] = useState([5]);
  const [notes, setNotes] = useState("");

  const symptomsQuery = trpc.symptoms.list.useQuery(
    filterType !== "all" ? { symptomType: filterType as SymptomType } : undefined
  );

  const createMutation = trpc.symptoms.create.useMutation({
    onSuccess: () => {
      toast.success("Registro de sintoma salvo!");
      resetForm();
      setIsOpen(false);
      symptomsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  const updateMutation = trpc.symptoms.update.useMutation({
    onSuccess: () => {
      toast.success("Registro atualizado!");
      resetForm();
      setIsOpen(false);
      symptomsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMutation = trpc.symptoms.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro removido.");
      symptomsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setSymptomType("focus");
    setSeverity([5]);
    setDuration("");
    setTriggersText("");
    setInterventionsText("");
    setEffectiveness([5]);
    setNotes("");
  };

  const startEditing = (entry: {
    id: number;
    symptomType: string;
    severity: number;
    duration: number | null;
    triggers: string[] | null;
    interventions: string[] | null;
    effectiveness: number | null;
    notes: string | null;
  }) => {
    setEditingId(entry.id);
    setSymptomType(entry.symptomType as SymptomType);
    setSeverity([entry.severity]);
    setDuration(entry.duration != null ? String(entry.duration) : "");
    setTriggersText((entry.triggers ?? []).join(", "));
    setInterventionsText((entry.interventions ?? []).join(", "));
    setEffectiveness([entry.effectiveness ?? 5]);
    setNotes(entry.notes ?? "");
    setIsOpen(true);
  };

  const splitToArray = (text: string) =>
    text
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const interventions = splitToArray(interventionsText);
    const triggers = splitToArray(triggersText);

    if (editingId != null) {
      // Ao editar, campos vazios viram null para conseguir limpar o que
      // estava preenchido antes.
      updateMutation.mutate({
        id: editingId,
        symptomType,
        severity: severity[0],
        duration: duration ? parseInt(duration) : null,
        triggers: triggers.length > 0 ? triggers : null,
        interventions: interventions.length > 0 ? interventions : null,
        effectiveness: interventions.length > 0 ? effectiveness[0] : null,
        notes: notes || null,
      });
      return;
    }

    createMutation.mutate({
      symptomType,
      severity: severity[0],
      duration: duration ? parseInt(duration) : undefined,
      triggers: triggers.length > 0 ? triggers : undefined,
      interventions: interventions.length > 0 ? interventions : undefined,
      effectiveness: interventions.length > 0 ? effectiveness[0] : undefined,
      notes: notes || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Remover este registro?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSeverityColor = (s: number) => {
    if (s <= 3) return "text-green-600";
    if (s <= 6) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  const hasInterventions = splitToArray(interventionsText).length > 0;

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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Monitoramento de Sintomas</h1>
            </div>
            <p className="text-gray-600">Acompanhe sintomas e intervenções ao longo do tempo</p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar Sintoma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId != null ? "Editar Registro de Sintoma" : "Novo Registro de Sintoma"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="symptomType">Tipo de Sintoma *</Label>
                  <Select
                    value={symptomType}
                    onValueChange={(v) => setSymptomType(v as SymptomType)}
                    required
                  >
                    <SelectTrigger aria-label="Tipo de sintoma">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(symptomLabels) as SymptomType[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {symptomLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Severidade: {severity[0]}/10</Label>
                  <Slider
                    value={severity}
                    onValueChange={setSeverity}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                    aria-label="Severidade do sintoma, de 1 a 10"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Leve</span>
                    <span>Moderado</span>
                    <span>Intenso</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="Ex: 30"
                  />
                </div>

                <TriggerInput
                  id="symptom-triggers"
                  value={triggersText}
                  onChange={setTriggersText}
                  placeholder="Ex: barulho alto, multidão, mudança de rotina"
                />

                <div>
                  <Label htmlFor="interventions">Intervenções utilizadas (separadas por vírgula)</Label>
                  <Input
                    id="interventions"
                    value={interventionsText}
                    onChange={(e) => setInterventionsText(e.target.value)}
                    placeholder="Ex: respiração profunda, fones de ouvido"
                  />
                </div>

                {hasInterventions && (
                  <div>
                    <Label>Efetividade das intervenções: {effectiveness[0]}/10</Label>
                    <Slider
                      value={effectiveness}
                      onValueChange={setEffectiveness}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                      aria-label="Efetividade das intervenções, de 1 a 10"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Não ajudou</span>
                      <span>Ajudou muito</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contexto, sensações, outros detalhes..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Salvando..."
                      : editingId != null
                        ? "Salvar alterações"
                        : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-60" aria-label="Filtrar por tipo de sintoma">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {(Object.keys(symptomLabels) as SymptomType[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {symptomLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* History */}
        <div className="space-y-4">
          {symptomsQuery.isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">Carregando...</p>
              </CardContent>
            </Card>
          ) : symptomsQuery.data && symptomsQuery.data.length > 0 ? (
            symptomsQuery.data.map((entry) => (
              <Card key={entry.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">
                        {formatDate(entry.date)}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            symptomColors[entry.symptomType as SymptomType] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {symptomLabels[entry.symptomType as SymptomType] || entry.symptomType}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium bg-gray-100 ${getSeverityColor(
                            entry.severity
                          )}`}
                        >
                          Severidade {entry.severity}/10
                        </span>
                        {entry.duration && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                            {entry.duration} min
                          </span>
                        )}
                        {entry.effectiveness && (
                          <span className="text-xs px-2 py-1 rounded bg-teal-100 text-teal-700">
                            Efetividade {entry.effectiveness}/10
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(entry)}
                        aria-label={`Editar o registro de ${symptomLabels[entry.symptomType as SymptomType] || entry.symptomType} de ${formatDate(entry.date)}`}
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                        aria-label={`Remover o registro de ${symptomLabels[entry.symptomType as SymptomType] || entry.symptomType} de ${formatDate(entry.date)}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(entry.triggers?.length || entry.interventions?.length || entry.notes) && (
                  <CardContent className="pt-0">
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Gatilhos:</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.triggers.map((t, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-orange-50 text-orange-700 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.interventions && entry.interventions.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-gray-500 mb-1">Intervenções:</p>
                        <div className="flex flex-wrap gap-1">
                          {entry.interventions.map((inv, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                            >
                              {inv}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  {filterType !== "all"
                    ? `Nenhum registro para "${symptomLabels[filterType as SymptomType]}"`
                    : "Nenhum sintoma registrado ainda"}
                </p>
                <Button onClick={() => setIsOpen(true)}>Registrar Primeiro Sintoma</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
