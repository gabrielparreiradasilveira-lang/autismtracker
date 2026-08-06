import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, MessageSquare, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const categoryLabels = {
  help: "Pedido de Ajuda",
  location: "Localização",
  status: "Status",
  custom: "Personalizada",
};

const categoryColors = {
  help: "bg-red-100 text-red-800",
  location: "bg-blue-100 text-blue-800",
  status: "bg-green-100 text-green-800",
  custom: "bg-purple-100 text-purple-800",
};

export default function PresetMessages() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    category: "help" as "help" | "location" | "status" | "custom",
    isDefault: false,
  });

  const { data: messages, isLoading, refetch } = trpc.crisis.getPresetMessages.useQuery();
  const createMessage = trpc.crisis.createPresetMessage.useMutation({
    onSuccess: () => {
      toast({ title: "Mensagem criada com sucesso!" });
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
  });
  const updateMessage = trpc.crisis.updatePresetMessage.useMutation({
    onSuccess: () => {
      toast({ title: "Mensagem atualizada com sucesso!" });
      refetch();
      setEditingMessage(null);
      resetForm();
    },
  });
  const deleteMessage = trpc.crisis.deletePresetMessage.useMutation({
    onSuccess: () => {
      toast({ title: "Mensagem removida com sucesso!" });
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      category: "help",
      isDefault: false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMessage) {
      updateMessage.mutate({
        messageId: editingMessage.id,
        ...formData,
      });
    } else {
      createMessage.mutate(formData);
    }
  };

  const handleEdit = (message: any) => {
    setEditingMessage(message);
    setFormData({
      title: message.title,
      message: message.message,
      category: message.category || "custom",
      isDefault: message.isDefault || false,
    });
  };

  const handleDelete = (messageId: number) => {
    if (confirm("Tem certeza que deseja remover esta mensagem?")) {
      deleteMessage.mutate({ messageId });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Mensagem copiada!" });
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Carregando mensagens...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mensagens Pré-escritas</h1>
        <p className="text-muted-foreground">
          Crie mensagens rápidas para enviar em momentos de crise
        </p>
      </div>

      <div className="mb-6">
        <Dialog open={isCreateOpen || !!editingMessage} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingMessage(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingMessage ? "Editar Mensagem" : "Nova Mensagem Pré-escrita"}
              </DialogTitle>
              <DialogDescription>
                Crie mensagens prontas para enviar rapidamente em momentos de crise
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Preciso de Ajuda"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  placeholder="Ex: Estou tendo uma crise e preciso de suporte. Pode me ligar?"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.message.length} caracteres
                </p>
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="help">Pedido de Ajuda</SelectItem>
                    <SelectItem value="location">Localização</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingMessage ? "Salvar Alterações" : "Criar Mensagem"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingMessage(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!messages || messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma mensagem cadastrada</h3>
            <p className="text-muted-foreground mb-4">
              Crie mensagens prontas para enviar rapidamente em momentos de crise
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Mensagem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {messages.map((msg: any) => (
            <Card key={msg.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{msg.title}</CardTitle>
                      {msg.category && (
                        <Badge className={categoryColors[msg.category as keyof typeof categoryColors]}>
                          {categoryLabels[msg.category as keyof typeof categoryLabels]}
                        </Badge>
                      )}
                    </div>
                    {msg.useCount > 0 && (
                      <CardDescription>Usada {msg.useCount} vez(es)</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopy(msg.message)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(msg)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(msg.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {msg.message}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
