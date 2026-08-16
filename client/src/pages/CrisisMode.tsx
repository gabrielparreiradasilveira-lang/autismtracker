import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/_core/hooks/useRequireAuth';
import PageLoader from '@/components/PageLoader';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Phone, 
  MessageSquare, 
  Wind, 
  HandMetal, 
  Activity,
  Clock,
  CheckCircle,
  X
} from 'lucide-react';

export default function CrisisMode() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [crisisActive, setCrisisActive] = useState(false);
  const [crisisStartTime, setCrisisStartTime] = useState<Date | null>(null);
  const [activeCrisisId, setActiveCrisisId] = useState<number | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [usedTechniques, setUsedTechniques] = useState<string[]>([]);

  // Fetch emergency contacts
  const contactsQuery = trpc.crisis.getEmergencyContacts.useQuery(undefined, {
    enabled: !!user,
  });

  // Fetch preset messages
  const messagesQuery = trpc.crisis.getPresetMessages.useQuery(undefined, {
    enabled: !!user,
  });

  // Create crisis event mutation
  const createCrisisMutation = trpc.crisis.createCrisisEvent.useMutation();

  // Resolve crisis event mutation
  const resolveCrisisMutation = trpc.crisis.resolveCrisisEvent.useMutation({
    onSuccess: () => {
      setCrisisActive(false);
      setCrisisStartTime(null);
      setActiveCrisisId(null);
      setUsedTechniques([]);
    },
  });

  const contacts = contactsQuery.data || [];
  const messages = messagesQuery.data || [];

  const startCrisis = async (severity: 'low' | 'medium' | 'high' | 'critical') => {
    setCrisisActive(true);
    setCrisisStartTime(new Date());
    
    const result = await createCrisisMutation.mutateAsync({ severity });
    if (result && typeof result === 'object' && 'result' in result) {
      const insertResult = result.result as any;
      if (insertResult && 'insertId' in insertResult) {
        setActiveCrisisId(insertResult.insertId);
      }
    }
  };

  const endCrisis = async (notes?: string) => {
    if (!activeCrisisId || !crisisStartTime) return;

    const duration = Math.floor((new Date().getTime() - crisisStartTime.getTime()) / 60000);
    
    await resolveCrisisMutation.mutateAsync({
      crisisId: activeCrisisId,
      duration,
      techniquesUsed: usedTechniques,
      notes,
    });
  };

  const quickTechniques = [
    {
      id: 'box-breathing',
      name: 'Respiração 4-4-4-4',
      icon: <Wind className="w-8 h-8" />,
      color: 'bg-blue-100 border-blue-300',
      description: 'Inspire 4s, segure 4s, expire 4s, segure 4s',
      duration: 120,
    },
    {
      id: '5-4-3-2-1',
      name: 'Grounding 5-4-3-2-1',
      icon: <HandMetal className="w-8 h-8" />,
      color: 'bg-green-100 border-green-300',
      description: '5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que saboreia',
      duration: 180,
    },
    {
      id: 'progressive-relaxation',
      name: 'Relaxamento Progressivo',
      icon: <Activity className="w-8 h-8" />,
      color: 'bg-purple-100 border-purple-300',
      description: 'Tensione e relaxe cada grupo muscular',
      duration: 300,
    },
  ];

  const handleCallContact = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleSendMessage = (phone: string, message: string) => {
    window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
  };

  const handleUseTechnique = (techniqueId: string) => {
    setSelectedTechnique(techniqueId);
    if (!usedTechniques.includes(techniqueId)) {
      setUsedTechniques([...usedTechniques, techniqueId]);
    }
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  if (!crisisActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="w-12 h-12 text-red-500" />
              <h1 className="text-4xl font-bold text-gray-900">Modo de Crise</h1>
            </div>
            <p className="text-lg text-gray-600">
              Você está seguro. Respire fundo. Vamos passar por isso juntos.
            </p>
          </div>

          {/* Crisis Severity Selection */}
          <Card className="mb-8 border-2 border-red-200">
            <CardHeader>
              <CardTitle className="text-center">Como você está se sentindo agora?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => startCrisis('low')}
                  className="h-24 text-lg bg-yellow-500 hover:bg-yellow-600"
                >
                  😟 Desconfortável
                  <br />
                  <span className="text-sm font-normal">Preciso de ajuda leve</span>
                </Button>
                <Button
                  onClick={() => startCrisis('medium')}
                  className="h-24 text-lg bg-orange-500 hover:bg-orange-600"
                >
                  😰 Ansioso
                  <br />
                  <span className="text-sm font-normal">Preciso de suporte</span>
                </Button>
                <Button
                  onClick={() => startCrisis('high')}
                  className="h-24 text-lg bg-red-500 hover:bg-red-600"
                >
                  😱 Muito Mal
                  <br />
                  <span className="text-sm font-normal">Preciso de ajuda urgente</span>
                </Button>
                <Button
                  onClick={() => startCrisis('critical')}
                  className="h-24 text-lg bg-red-700 hover:bg-red-800"
                >
                  🆘 Crise Severa
                  <br />
                  <span className="text-sm font-normal">Emergência</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Access */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-blue-200 hover:shadow-lg transition cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Phone className="w-6 h-6" />
                  Contatos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {contacts.length} contatos de emergência salvos
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 hover:shadow-lg transition cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <MessageSquare className="w-6 h-6" />
                  Mensagens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {messages.length} mensagens pré-escritas
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 hover:shadow-lg transition cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Wind className="w-6 h-6" />
                  Técnicas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  {quickTechniques.length} técnicas rápidas disponíveis
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Crisis Active View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Crisis Active Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Heart className="w-10 h-10 text-red-500 animate-pulse" />
            <h1 className="text-3xl font-bold text-gray-900">Você Está Seguro</h1>
          </div>
          <p className="text-lg text-gray-700 mb-2">
            Respire fundo. Vamos passar por isso juntos.
          </p>
          {crisisStartTime && (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span>
                Iniciado há {Math.floor((new Date().getTime() - crisisStartTime.getTime()) / 60000)} minutos
              </span>
            </div>
          )}
        </div>

        {/* Main Crisis Tabs */}
        <Tabs defaultValue="techniques" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="techniques">
              <Wind className="w-4 h-4 mr-2" />
              Técnicas
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Phone className="w-4 h-4 mr-2" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagens
            </TabsTrigger>
          </TabsList>

          {/* Techniques Tab */}
          <TabsContent value="techniques">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickTechniques.map((technique) => (
                <Card
                  key={technique.id}
                  className={`border-2 cursor-pointer hover:shadow-lg transition ${technique.color} ${
                    usedTechniques.includes(technique.id) ? 'ring-4 ring-green-500' : ''
                  }`}
                  onClick={() => handleUseTechnique(technique.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {technique.icon}
                        <CardTitle className="text-lg">{technique.name}</CardTitle>
                      </div>
                      {usedTechniques.includes(technique.id) && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-2">{technique.description}</p>
                    <p className="text-xs text-gray-500">
                      Duração: {Math.floor(technique.duration / 60)} minutos
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            {contacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum contato de emergência cadastrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contacts.map((contact: any) => (
                  <Card key={contact.id} className="border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Principal
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{contact.relationship}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {contact.phone && (
                          <Button
                            onClick={() => handleCallContact(contact.phone)}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <Phone className="w-4 h-4 mr-2" />
                            Ligar: {contact.phone}
                          </Button>
                        )}
                        {contact.notes && (
                          <p className="text-xs text-gray-500 mt-2">{contact.notes}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            {messages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma mensagem pré-escrita cadastrada</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {messages.map((msg: any) => (
                  <Card key={msg.id} className="border-2 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg">{msg.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 mb-4">{msg.message}</p>
                      <div className="flex gap-2">
                        {contacts.slice(0, 3).map((contact: any) => (
                          <Button
                            key={contact.id}
                            onClick={() => handleSendMessage(contact.phone, msg.message)}
                            variant="outline"
                            size="sm"
                          >
                            Enviar para {contact.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* End Crisis Button */}
        <Card className="mt-8 border-2 border-green-300 bg-green-50">
          <CardContent className="py-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 mb-4">
                Está se sentindo melhor?
              </p>
              <Button
                onClick={() => endCrisis()}
                className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
              >
                <CheckCircle className="w-6 h-6 mr-2" />
                Finalizar Modo de Crise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
