import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Bell, ArrowLeft, Plus, Trash2, Sparkles, Clock } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Reminders() {
  const { user, isAuthenticated, loading } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("mood_diary");
  const [frequency, setFrequency] = useState<string>("daily");
  const [time, setTime] = useState("09:00");
  const [isSmart, setIsSmart] = useState(false);

  const remindersQuery = trpc.reminders.list.useQuery();
  const smartSuggestionsQuery = trpc.reminders.getSmartSuggestions.useQuery();

  const createMutation = trpc.reminders.create.useMutation({
    onSuccess: () => {
      toast.success("Lembrete criado com sucesso!");
      setShowForm(false);
      resetForm();
      remindersQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar lembrete: " + error.message);
    },
  });

  const deleteMutation = trpc.reminders.delete.useMutation({
    onSuccess: () => {
      toast.success("Lembrete removido!");
      remindersQuery.refetch();
    },
  });

  const updateMutation = trpc.reminders.update.useMutation({
    onSuccess: () => {
      toast.success("Lembrete atualizado!");
      remindersQuery.refetch();
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("mood_diary");
    setFrequency("daily");
    setTime("09:00");
    setIsSmart(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      description: description || undefined,
      type: type as any,
      frequency: frequency as any,
      time,
      isSmart,
    });
  };

  const handleToggle = (id: number, isActive: boolean) => {
    updateMutation.mutate({ id, isActive: !isActive });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este lembrete?")) {
      deleteMutation.mutate({ id });
    }
  };

  const applySmartSuggestion = (suggestedTime: string) => {
    setTime(suggestedTime);
    setIsSmart(true);
    toast.success("Horário sugerido aplicado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = "/";
    return null;
  }

  const typeLabels: Record<string, string> = {
    mood_diary: "Diário de Humor",
    medication: "Medicação",
    therapy: "Terapia",
    selfcare: "Autocuidado",
    routine: "Rotina",
    exercise: "Exercício",
  };

  const frequencyLabels: Record<string, string> = {
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensalmente",
    smart: "Inteligente",
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Lembretes</h1>
                <p className="text-gray-600">Gerencie seus lembretes inteligentes</p>
              </div>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Lembrete
            </Button>
          </div>
        </div>

        {/* Smart Suggestions */}
        {smartSuggestionsQuery.data?.hasSufficientData && showForm && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-900">
                <Sparkles className="w-5 h-5" />
                Sugestões Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-purple-800 mb-4">
                {smartSuggestionsQuery.data.message}
              </p>
              <div className="grid gap-3">
                {smartSuggestionsQuery.data.suggestions.map((suggestion: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200"
                  >
                    <div>
                      <div className="font-semibold text-purple-900 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {suggestion.time}
                      </div>
                      <div className="text-sm text-gray-600">
                        {suggestion.reason} ({suggestion.frequency}x)
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => applySmartSuggestion(suggestion.time)}
                    >
                      Usar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Criar Novo Lembrete</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Registrar humor do dia"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes adicionais (opcional)"
                    rows={2}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Tipo</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mood_diary">Diário de Humor</SelectItem>
                        <SelectItem value="medication">Medicação</SelectItem>
                        <SelectItem value="therapy">Terapia</SelectItem>
                        <SelectItem value="selfcare">Autocuidado</SelectItem>
                        <SelectItem value="routine">Rotina</SelectItem>
                        <SelectItem value="exercise">Exercício</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="frequency">Frequência</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diariamente</SelectItem>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="monthly">Mensalmente</SelectItem>
                        <SelectItem value="smart">Inteligente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="smart"
                    checked={isSmart}
                    onCheckedChange={setIsSmart}
                  />
                  <Label htmlFor="smart" className="cursor-pointer">
                    Lembrete Inteligente (aprende com seus hábitos)
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Lembrete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reminders List */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Lembretes</CardTitle>
          </CardHeader>
          <CardContent>
            {remindersQuery.isLoading ? (
              <p className="text-sm text-gray-600">Carregando...</p>
            ) : remindersQuery.data && remindersQuery.data.length > 0 ? (
              <div className="space-y-3">
                {remindersQuery.data.map((reminder: any) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                        {reminder.isSmart && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            <Sparkles className="w-3 h-3" />
                            Inteligente
                          </span>
                        )}
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {reminder.time}
                        </span>
                        <span>{typeLabels[reminder.type]}</span>
                        <span>{frequencyLabels[reminder.frequency]}</span>
                        {reminder.responseCount > 0 && (
                          <span className="text-green-600">
                            Respondido {reminder.responseCount}x
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.isActive}
                        onCheckedChange={() => handleToggle(reminder.id, reminder.isActive)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(reminder.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Nenhum lembrete configurado ainda
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Lembrete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sobre Lembretes Inteligentes</h3>
                <p className="text-sm text-blue-800">
                  Lembretes inteligentes aprendem com seus hábitos de registro. Quanto mais você usa o app,
                  mais precisos ficam os horários sugeridos. O sistema analisa quando você costuma registrar
                  seu humor e sugere os melhores horários para lembretes futuros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
