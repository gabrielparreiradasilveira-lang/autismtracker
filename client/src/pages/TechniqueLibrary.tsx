import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Heart, Sparkles, Star, Wind } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  breathing: "Respiração",
  grounding: "Ancoragem",
  physical: "Físico",
  cognitive: "Cognitivo",
  social: "Social",
};

const difficultyLabels: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export default function TechniqueLibrary() {
  const { user, isAuthenticated, loading } = useAuth();
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [logDialogTechniqueId, setLogDialogTechniqueId] = useState<number | null>(null);
  const [effectiveness, setEffectiveness] = useState([7]);
  const [notes, setNotes] = useState("");

  const techniquesQuery = trpc.techniques.list.useQuery({
    category: category === "all" ? undefined : (category as any),
    difficulty: difficulty === "all" ? undefined : (difficulty as any),
  });

  const toggleFavoriteMutation = trpc.techniques.toggleFavorite.useMutation({
    onSuccess: (data) => {
      toast.success(data.isFavorite ? "Adicionada aos favoritos" : "Removida dos favoritos");
      techniquesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao favoritar: " + error.message);
    },
  });

  const logUsageMutation = trpc.techniques.logUsage.useMutation({
    onSuccess: () => {
      toast.success("Uso registrado com sucesso!");
      setLogDialogTechniqueId(null);
      setEffectiveness([7]);
      setNotes("");
      techniquesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar uso: " + error.message);
    },
  });

  const openLogDialog = (techniqueId: number) => {
    setLogDialogTechniqueId(techniqueId);
    setEffectiveness([7]);
    setNotes("");
  };

  const handleLogUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDialogTechniqueId) return;
    logUsageMutation.mutate({
      techniqueId: logDialogTechniqueId,
      effectiveness: effectiveness[0],
      notes: notes || undefined,
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

  const techniques = techniquesQuery.data || [];
  const activeTechnique = techniques.find((t) => t.id === logDialogTechniqueId);

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
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
              <Wind className="w-6 h-6 text-pink-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Biblioteca de Técnicas</h1>
          </div>
          <p className="text-gray-600">
            Descubra técnicas de autorregulação, favorite as que funcionam para você e
            acompanhe sua efetividade ao longo do tempo
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="w-full sm:w-56">
            <Label htmlFor="category-filter">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category-filter" aria-label="Filtrar por categoria">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-56">
            <Label htmlFor="difficulty-filter">Dificuldade</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty-filter" aria-label="Filtrar por dificuldade">
                <SelectValue placeholder="Todas as dificuldades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                {Object.entries(difficultyLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Techniques Grid */}
        {techniquesQuery.isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">Carregando técnicas...</p>
            </CardContent>
          </Card>
        ) : techniques.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {techniques.map((technique) => (
              <Card key={technique.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <CardTitle className="text-lg">{technique.title}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded">
                          {categoryLabels[technique.category] || technique.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {difficultyLabels[technique.difficulty] || technique.difficulty}
                        </span>
                        {technique.duration && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {technique.duration} min
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavoriteMutation.mutate({ techniqueId: technique.id })}
                      aria-label={technique.isFavorite ? `Remover ${technique.title} dos favoritos` : `Adicionar ${technique.title} aos favoritos`}
                      aria-pressed={technique.isFavorite}
                      className="p-2 rounded-full hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 shrink-0"
                    >
                      <Star
                        className={`w-5 h-5 ${technique.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                      />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{technique.description}</p>

                  {technique.instructions && technique.instructions.length > 0 && (
                    <ol className="space-y-1 mb-4 text-sm text-gray-700 list-decimal list-inside">
                      {technique.instructions.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      {technique.usageCount > 0 ? (
                        <span>
                          Usada {technique.usageCount}x
                          {technique.effectiveness ? ` · efetividade ${technique.effectiveness}/10` : ""}
                        </span>
                      ) : (
                        <span>Ainda não registrada</span>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openLogDialog(technique.id)}>
                      <Sparkles className="w-4 h-4 mr-1" />
                      Registrar uso
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                Nenhuma técnica encontrada para esses filtros
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Log Usage Dialog */}
      <Dialog open={logDialogTechniqueId !== null} onOpenChange={(open) => !open && setLogDialogTechniqueId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Registrar uso {activeTechnique ? `— ${activeTechnique.title}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLogUsage} className="space-y-4">
            <div>
              <Label htmlFor="effectiveness-slider">
                Quão eficaz foi essa técnica agora? {effectiveness[0]}/10
              </Label>
              <Slider
                id="effectiveness-slider"
                aria-label="Nível de efetividade da técnica, de 1 a 10"
                value={effectiveness}
                onValueChange={setEffectiveness}
                min={1}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="log-notes">Notas (opcional)</Label>
              <Textarea
                id="log-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que estava acontecendo? Como você se sentiu depois?"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={logUsageMutation.isPending} className="flex-1">
                {logUsageMutation.isPending ? "Salvando..." : "Salvar registro"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setLogDialogTechniqueId(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
