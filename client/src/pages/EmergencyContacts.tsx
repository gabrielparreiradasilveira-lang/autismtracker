import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Phone, Mail, Plus, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EmergencyContacts() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
    isPrimary: false,
    notes: "",
  });

  const { data: contacts, isLoading, refetch } = trpc.crisis.getEmergencyContacts.useQuery();
  const createContact = trpc.crisis.createEmergencyContact.useMutation({
    onSuccess: () => {
      toast({ title: "Contato criado com sucesso!" });
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
  });
  const updateContact = trpc.crisis.updateEmergencyContact.useMutation({
    onSuccess: () => {
      toast({ title: "Contato atualizado com sucesso!" });
      refetch();
      setEditingContact(null);
      resetForm();
    },
  });
  const deleteContact = trpc.crisis.deleteEmergencyContact.useMutation({
    onSuccess: () => {
      toast({ title: "Contato removido com sucesso!" });
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      relationship: "",
      phone: "",
      email: "",
      isPrimary: false,
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      updateContact.mutate({
        contactId: editingContact.id,
        ...formData,
      });
    } else {
      createContact.mutate(formData);
    }
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      relationship: contact.relationship,
      phone: contact.phone || "",
      email: contact.email || "",
      isPrimary: contact.isPrimary || false,
      notes: contact.notes || "",
    });
  };

  const handleDelete = (contactId: number) => {
    if (confirm("Tem certeza que deseja remover este contato?")) {
      deleteContact.mutate({ contactId });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Carregando contatos...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contatos de Emergência</h1>
        <p className="text-muted-foreground">
          Gerencie seus contatos de confiança para momentos de crise
        </p>
      </div>

      <div className="mb-6">
        <Dialog open={isCreateOpen || !!editingContact} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingContact(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingContact ? "Editar Contato" : "Novo Contato de Emergência"}
              </DialogTitle>
              <DialogDescription>
                Adicione alguém de confiança para contatar em momentos de crise
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relacionamento *</Label>
                <Input
                  id="relationship"
                  placeholder="Ex: Mãe, Terapeuta, Amigo"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+55 11 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                />
                <Label htmlFor="isPrimary">Contato principal (recebe notificações automáticas)</Label>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Informações adicionais..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingContact ? "Salvar Alterações" : "Criar Contato"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingContact(null);
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

      {!contacts || contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum contato cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione contatos de confiança para ter suporte em momentos de crise
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Primeiro Contato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact: any) => (
            <Card key={contact.id} className={contact.isPrimary ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{contact.name}</CardTitle>
                    <CardDescription>{contact.relationship}</CardDescription>
                    {contact.isPrimary && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded">
                        Contato Principal
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(contact.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="text-sm hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-sm hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{contact.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
