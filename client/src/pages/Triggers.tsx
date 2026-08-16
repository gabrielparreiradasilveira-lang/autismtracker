import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Shield, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  sound: "Som",
  light: "Luz",
  texture: "Textura",
  smell: "Cheiro",
  taste: "Sabor",
  visual: "Visual",
  other: "Outro",
};

const frequencyLabels: Record<string, string> = {
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
  rarely: "Raramente",
};
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Triggers() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState([5]);
  const [description, setDescription] = useState("");
  const [copingStrategy, setCopingStrategy] = useState("");
  const [frequency, setFrequency] = useState("");

  const triggersQuery = trpc.triggers.list.useQuery();

  const createTriggerMutation = trpc.triggers.create.useMutation({
    onSuccess: () => {
      toast.success("Gatilho sensorial registrado com sucesso!");
      resetForm();
      setIsOpen(false);
      triggersQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar gatilho: " + error.message);
    },
  });

  const updateTriggerMutation = trpc.triggers.update.useMutation({
    onSuccess: () => {
      toast.success("Gatilho atualizado com sucesso!");
      resetForm();
      setIsOpen(false);
      setEditingId(null);
      triggersQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar gatilho: " + error.message);
    },
  });

  const deleteTriggerMutation = trpc.triggers.delete.useMutation({
    onSuccess: () => {
      toast.success("Gatilho removido com sucesso!");
      triggersQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover gatilho: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setSeverity([5]);
    setDescription("");
    setCopingStrategy("");
    setFrequency("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateTriggerMutation.mutate({
        id: editingId,
        name,
        category,
        severity: severity[0],
        description: description || undefined,
        copingStrategy: copingStrategy || undefined,
        frequency,
      });
    } else {
      createTriggerMutation.mutate({
        name,
        category,
        severity: severity[0],
        description: description || undefined,
        copingStrategy: copingStrategy || undefined,
        frequency,
      });
    }
  };

  const handleEdit = (trigger: any) => {
    setEditingId(trigger.id);
    setName(trigger.name);
    setCategory(trigger.category);
    setSeverity([trigger.severity]);
    setDescription(trigger.description || "");
    setCopingStrategy(trigger.copingStrategy || "");
    setFrequency(trigger.frequency);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este gatilho?")) {
      deleteTriggerMutation.mutate({ id });
    }
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Gatilhos Sensoriais</h1>
            </div>
            <p className="text-gray-600">Gerencie seus gatilhos e estratégias de enfrentamento</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingId(null); }}>
                Adicionar Gatilho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Gatilho" : "Novo Gatilho"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Gatilho *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Barulho alto"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sound">Som</SelectItem>
                      <SelectItem value="light">Luz</SelectItem>
                      <SelectItem value="texture">Textura</SelectItem>
                      <SelectItem value="smell">Cheiro</SelectItem>
                      <SelectItem value="taste">Sabor</SelectItem>
                      <SelectItem value="visual">Visual</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
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
                  />
                </div>

                <div>
                  <Label htmlFor="frequency">Frequência *</Label>
                  <Select value={frequency} onValueChange={setFrequency} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Com que frequência ocorre?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diariamente</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="monthly">Mensalmente</SelectItem>
                      <SelectItem value="rarely">Raramente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o gatilho e como ele te afeta"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="copingStrategy">Estratégia de Enfrentamento</Label>
                  <Textarea
                    id="copingStrategy"
                    value={copingStrategy}
                    onChange={(e) => setCopingStrategy(e.target.value)}
                    placeholder="O que você faz para lidar com este gatilho?"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createTriggerMutation.isPending || updateTriggerMutation.isPending} className="flex-1">
                    {(createTriggerMutation.isPending || updateTriggerMutation.isPending) ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Triggers List */}
        <div className="space-y-4">
          {triggersQuery.isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">Carregando...</p>
              </CardContent>
            </Card>
          ) : triggersQuery.data && triggersQuery.data.length > 0 ? (
            triggersQuery.data.map((trigger) => (
              <Card key={trigger.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{trigger.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {categoryLabels[trigger.category] || trigger.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                          Severidade: {trigger.severity}/10
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {frequencyLabels[trigger.frequency] || trigger.frequency}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(trigger)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(trigger.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {(trigger.description || trigger.copingStrategy) && (
                  <CardContent>
                    {trigger.description && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Descrição:</p>
                        <p className="text-sm text-gray-600">{trigger.description}</p>
                      </div>
                    )}
                    {trigger.copingStrategy && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Estratégia de Enfrentamento:</p>
                        <p className="text-sm text-gray-600">{trigger.copingStrategy}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">Nenhum gatilho sensorial registrado ainda</p>
                <Button onClick={() => setIsOpen(true)}>Adicionar Primeiro Gatilho</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
