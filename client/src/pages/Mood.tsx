import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowLeft } from "lucide-react";
import { MoodCalendar } from "@/components/MoodCalendar";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Mood() {
  const { user, isAuthenticated, loading } = useAuth();
  const [moodLevel, setMoodLevel] = useState([5]);
  const [anxietyLevel, setAnxietyLevel] = useState([5]);
  const [stressLevel, setStressLevel] = useState([5]);
  const [energyLevel, setEnergyLevel] = useState([5]);
  const [notes, setNotes] = useState("");
  const [triggers, setTriggers] = useState("");

  const createMoodMutation = trpc.mood.create.useMutation({
    onSuccess: () => {
      toast.success("Entrada de humor registrada com sucesso!");
      setMoodLevel([5]);
      setAnxietyLevel([5]);
      setStressLevel([5]);
      setEnergyLevel([5]);
      setNotes("");
      setTriggers("");
      moodEntriesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar entrada de humor: " + error.message);
    },
  });

  const moodEntriesQuery = trpc.mood.list.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMoodMutation.mutate({
      moodLevel: moodLevel[0],
      anxietyLevel: anxietyLevel[0],
      stressLevel: stressLevel[0],
      energyLevel: energyLevel[0],
      notes: notes || undefined,
      triggers: triggers ? triggers.split(",").map(t => t.trim()) : undefined,
    });
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
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Diário de Humor</h1>
          </div>
          <p className="text-gray-600">Registre como você está se sentindo hoje</p>
        </div>

        {/* Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nova Entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Humor: {moodLevel[0]}/10</Label>
                  <Slider
                    value={moodLevel}
                    onValueChange={setMoodLevel}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Ansiedade: {anxietyLevel[0]}/10</Label>
                  <Slider
                    value={anxietyLevel}
                    onValueChange={setAnxietyLevel}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Estresse: {stressLevel[0]}/10</Label>
                  <Slider
                    value={stressLevel}
                    onValueChange={setStressLevel}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Energia: {energyLevel[0]}/10</Label>
                  <Slider
                    value={energyLevel}
                    onValueChange={setEnergyLevel}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="triggers">Gatilhos (separados por vírgula)</Label>
                  <Input
                    id="triggers"
                    value={triggers}
                    onChange={(e) => setTriggers(e.target.value)}
                    placeholder="Ex: barulho alto, luz forte"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Como foi seu dia? O que aconteceu?"
                    rows={4}
                  />
                </div>
              </div>

              <Button type="submit" disabled={createMoodMutation.isPending} className="w-full">
                {createMoodMutation.isPending ? "Salvando..." : "Salvar Entrada"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Mood Calendar */}
        {moodEntriesQuery.data && moodEntriesQuery.data.length > 0 && (
          <MoodCalendar 
            entries={moodEntriesQuery.data.map((e: any) => ({
              date: new Date(e.date),
              moodLevel: e.moodLevel,
              anxietyLevel: e.anxietyLevel,
              stressLevel: e.stressLevel,
              energyLevel: e.energyLevel,
            }))}
          />
        )}

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {moodEntriesQuery.isLoading ? (
              <p className="text-sm text-gray-600">Carregando...</p>
            ) : moodEntriesQuery.data && moodEntriesQuery.data.length > 0 ? (
              <div className="space-y-4">
                {moodEntriesQuery.data.map((entry) => (
                  <div key={entry.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium">
                        {new Date(entry.date).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                      <div>Humor: {entry.moodLevel}/10</div>
                      <div>Ansiedade: {entry.anxietyLevel}/10</div>
                      <div>Estresse: {entry.stressLevel}/10</div>
                      <div>Energia: {entry.energyLevel}/10</div>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma entrada registrada ainda</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
