import { useRequireAuth } from "@/_core/hooks/useRequireAuth";
import PageLoader from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  
  const [theme, setTheme] = useState("light");
  const [fontSize, setFontSize] = useState("medium");
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const settingsQuery = trpc.settings.get.useQuery();
  
  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      settingsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setTheme(settingsQuery.data.theme || "light");
      setFontSize(settingsQuery.data.fontSize || "medium");
      setHighContrast(settingsQuery.data.highContrast || false);
      setReduceMotion(settingsQuery.data.reduceMotion || false);
      setSoundEnabled(settingsQuery.data.soundEnabled ?? true);
      setNotificationsEnabled(settingsQuery.data.notificationsEnabled ?? true);
    }
  }, [settingsQuery.data]);

  const handleSave = () => {
    updateSettingsMutation.mutate({
      theme,
      fontSize,
      highContrast,
      reduceMotion,
      soundEnabled,
      notificationsEnabled,
    });
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
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-gray-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          </div>
          <p className="text-gray-600">Personalize sua experiência</p>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="theme">Tema</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fontSize">Tamanho da Fonte</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger id="fontSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequena</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alto Contraste</Label>
                  <p className="text-sm text-gray-500">Aumenta o contraste das cores para melhor visibilidade</p>
                </div>
                <Switch checked={highContrast} onCheckedChange={setHighContrast} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reduzir Movimento</Label>
                  <p className="text-sm text-gray-500">Minimiza animações e transições</p>
                </div>
                <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notificações e Sons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sons Habilitados</Label>
                  <p className="text-sm text-gray-500">Reproduz sons de feedback e alertas</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações</Label>
                  <p className="text-sm text-gray-500">Receba lembretes e notificações</p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-gray-500">Nome</Label>
                <p className="font-medium">{user.name || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Email</Label>
                <p className="font-medium">{user.email || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-500">Membro desde</Label>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={updateSettingsMutation.isPending}
              size="lg"
            >
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
