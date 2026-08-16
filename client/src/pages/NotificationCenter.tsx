import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/_core/hooks/useRequireAuth';
import PageLoader from '@/components/PageLoader';
import { trpc } from '@/lib/trpc';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle, Trash2, Settings, Zap } from 'lucide-react';

export default function NotificationCenter() {
  const { user, isAuthenticated, loading } = useRequireAuth();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  
  const {
    isSupported,
    isSubscribed,
    permissionStatus,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  } = usePushNotifications();

  // Fetch notifications
  const notificationsQuery = trpc.notifications.getNotifications.useQuery(
    { limit: 50 },
    { enabled: !!user }
  );

  // Fetch unread count
  const unreadCountQuery = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
  });

  // Mark as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = trpc.notifications.deleteNotification.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    },
  });

  const notifications = notificationsQuery.data || [];
  const unreadCount = unreadCountQuery.data?.count || 0;

  const handleSubscribe = async () => {
    try {
      await subscribe();
      // Enviar notificação de teste
      await sendLocalNotification({
        title: 'Notificações Ativadas!',
        body: 'Você receberá notificações push a partir de agora.',
        icon: '✅',
      });
    } catch (error) {
      console.error('Erro ao inscrever em notificações:', error);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe();
    } catch (error) {
      console.error('Erro ao desinscrever:', error);
    }
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleDelete = (notificationId: number) => {
    deleteNotificationMutation.mutate({ notificationId });
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      reminder: '🔔',
      challenge: '🎯',
      badge: '🏆',
      achievement: '⭐',
      routine: '✅',
      breathing: '🫁',
      general: '📢',
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      reminder: 'bg-blue-50 border-blue-200',
      challenge: 'bg-purple-50 border-purple-200',
      badge: 'bg-yellow-50 border-yellow-200',
      achievement: 'bg-green-50 border-green-200',
      routine: 'bg-cyan-50 border-cyan-200',
      breathing: 'bg-pink-50 border-pink-200',
      general: 'bg-gray-50 border-gray-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  if (loading) return <PageLoader />;

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Bell className="w-10 h-10 text-blue-600" />
            Centro de Notificações
          </h1>
          <p className="text-gray-600">Gerencie suas notificações e preferências</p>
        </div>

        {/* Push Notifications Status */}
        <Card className="mb-8 border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              Notificações Push
            </CardTitle>
            <CardDescription>
              Receba notificações mesmo quando o app está fechado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Status</p>
                  <p className="text-sm text-gray-600">
                    {!isSupported
                      ? 'Não suportado neste navegador'
                      : isSubscribed
                      ? 'Ativado'
                      : 'Desativado'}
                  </p>
                </div>
                <Badge
                  className={
                    isSubscribed
                      ? 'bg-green-500'
                      : 'bg-gray-500'
                  }
                >
                  {isSubscribed ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {isSupported && (
                <div className="flex gap-2">
                  {!isSubscribed ? (
                    <Button
                      onClick={handleSubscribe}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Ativar Notificações Push
                    </Button>
                  ) : (
                    <Button
                      onClick={handleUnsubscribe}
                      variant="outline"
                    >
                      Desativar Notificações
                    </Button>
                  )}
                </div>
              )}

              {!isSupported && (
                <p className="text-sm text-amber-600">
                  Seu navegador não suporta notificações push. Use Chrome, Firefox ou Edge para ativar este recurso.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não Lidas ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="settings">
              Preferências
            </TabsTrigger>
          </TabsList>

          {/* All Notifications */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Notificações</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhuma notificação ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notif: any) => (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                          getNotificationColor(notif.type)
                        } ${!notif.read ? 'border-l-4 border-l-blue-600' : ''}`}
                        onClick={() => setSelectedNotification(notif)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">
                                {getNotificationIcon(notif.type)}
                              </span>
                              <p className="font-semibold text-gray-900">
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <Badge className="bg-blue-500">Novo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 ml-10">
                              {notif.body}
                            </p>
                            <p className="text-xs text-gray-500 mt-2 ml-10">
                              {new Date(notif.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {!notif.read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notif.id);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notif.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Unread Notifications */}
          <TabsContent value="unread">
            <Card>
              <CardHeader>
                <CardTitle>Notificações Não Lidas</CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.filter((n: any) => !n.read).length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <p className="text-gray-500">Você está em dia com suas notificações!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications
                      .filter((n: any) => !n.read)
                      .map((notif: any) => (
                        <div
                          key={notif.id}
                          className={`p-4 rounded-lg border-2 border-l-4 border-l-blue-600 cursor-pointer transition ${getNotificationColor(
                            notif.type
                          )}`}
                          onClick={() => setSelectedNotification(notif)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">
                                  {getNotificationIcon(notif.type)}
                                </span>
                                <p className="font-semibold text-gray-900">
                                  {notif.title}
                                </p>
                              </div>
                              <p className="text-sm text-gray-700 ml-10">
                                {notif.body}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notif.id);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notif.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Preferências de Notificações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Lembretes</p>
                      <p className="text-sm text-gray-600">Notificações sobre lembretes inteligentes</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Desafios</p>
                      <p className="text-sm text-gray-600">Notificações sobre desafios semanais</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Badges</p>
                      <p className="text-sm text-gray-600">Notificações quando você desbloqueia badges</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">Rotinas</p>
                      <p className="text-sm text-gray-600">Lembretes para completar suas rotinas</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>

                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                    Salvar Preferências
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Selected Notification Detail */}
        {selectedNotification && (
          <Card className="mt-6 bg-indigo-50 border-indigo-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-4xl">
                      {getNotificationIcon(selectedNotification.type)}
                    </span>
                    {selectedNotification.title}
                  </CardTitle>
                  <CardDescription>
                    {new Date(selectedNotification.createdAt).toLocaleString('pt-BR')}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{selectedNotification.body}</p>
              <div className="flex gap-2">
                {!selectedNotification.read && (
                  <Button
                    onClick={() => {
                      handleMarkAsRead(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                  >
                    Marcar como Lida
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDelete(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                >
                  Deletar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
