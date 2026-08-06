import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, ArrowLeft, Edit, Trash2, Plus, Check } from "lucide-react";
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

export default function Routines() {
  const { user, isAuthenticated, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [newTask, setNewTask] = useState("");

  const routinesQuery = trpc.routines.list.useQuery();

  const createRoutineMutation = trpc.routines.create.useMutation({
    onSuccess: () => {
      toast.success("Rotina criada com sucesso!");
      resetForm();
      setIsOpen(false);
      routinesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar rotina: " + error.message);
    },
  });

  const updateRoutineMutation = trpc.routines.update.useMutation({
    onSuccess: () => {
      toast.success("Rotina atualizada com sucesso!");
      resetForm();
      setIsOpen(false);
      setEditingId(null);
      routinesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar rotina: " + error.message);
    },
  });

  const deleteRoutineMutation = trpc.routines.delete.useMutation({
    onSuccess: () => {
      toast.success("Rotina removida com sucesso!");
      routinesQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover rotina: " + error.message);
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setTimeOfDay("");
    setTasks([""]);
    setNewTask("");
  };

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks.filter(t => t.trim()), newTask.trim()]);
      setNewTask("");
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validTasks = tasks.filter(t => t.trim());
    if (validTasks.length === 0) {
      toast.error("Adicione pelo menos uma tarefa à rotina");
      return;
    }

    if (editingId) {
      updateRoutineMutation.mutate({
        id: editingId,
        title: name,
        description: description || undefined,
        timeOfDay,
        tasks: validTasks,
      });
    } else {
      createRoutineMutation.mutate({
        title: name,
        description: description || undefined,
        timeOfDay,
        tasks: validTasks,
      });
    }
  };

  const handleEdit = (routine: any) => {
    setEditingId(routine.id);
    setName(routine.title);
    setDescription(routine.description || "");
    setTimeOfDay(routine.timeOfDay);
    setTasks(routine.tasks || [""]);
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta rotina?")) {
      deleteRoutineMutation.mutate({ id });
    }
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Rotinas Diárias</h1>
            </div>
            <p className="text-gray-600">Organize e acompanhe suas rotinas</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingId(null); }}>
                Adicionar Rotina
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Rotina" : "Nova Rotina"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Rotina *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Rotina Matinal"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="timeOfDay">Período do Dia *</Label>
                  <Select value={timeOfDay} onValueChange={setTimeOfDay} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Manhã</SelectItem>
                      <SelectItem value="afternoon">Tarde</SelectItem>
                      <SelectItem value="evening">Noite</SelectItem>
                      <SelectItem value="night">Madrugada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o objetivo desta rotina"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Tarefas *</Label>
                  <div className="space-y-2 mt-2">
                    {tasks.filter(t => t.trim()).map((task, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input value={task} disabled className="flex-1" />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTask(index)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Nova tarefa"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                      />
                      <Button type="button" onClick={addTask}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createRoutineMutation.isPending || updateRoutineMutation.isPending} className="flex-1">
                    {(createRoutineMutation.isPending || updateRoutineMutation.isPending) ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Routines List */}
        <div className="space-y-4">
          {routinesQuery.isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600">Carregando...</p>
              </CardContent>
            </Card>
          ) : routinesQuery.data && routinesQuery.data.length > 0 ? (
            routinesQuery.data.map((routine) => (
              <Card key={routine.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{routine.title}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {routine.timeOfDay === 'morning' ? 'Manhã' : 
                           routine.timeOfDay === 'afternoon' ? 'Tarde' : 
                           routine.timeOfDay === 'evening' ? 'Noite' : 'Madrugada'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {routine.tasks?.length || 0} tarefas
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(routine)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(routine.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {routine.description && (
                    <p className="text-sm text-gray-600 mb-3">{routine.description}</p>
                  )}
                  <div className="space-y-2">
                    {routine.tasks?.map((task: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-xs text-gray-500">{index + 1}</span>
                        </div>
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">Nenhuma rotina criada ainda</p>
                <Button onClick={() => setIsOpen(true)}>Criar Primeira Rotina</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
