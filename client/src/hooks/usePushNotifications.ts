import { useEffect, useState, useCallback } from 'react';

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: any[];
}

interface NotificationSubscription {
  endpoint: string;
  auth: string;
  p256dh: string;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [error, setError] = useState<string | null>(null);

  // Verificar suporte a notificações push
  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Registrar Service Worker
  const registerServiceWorker = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers não são suportados neste navegador');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      console.log('[usePushNotifications] Service Worker registrado:', registration);
      return registration;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar Service Worker';
      setError(message);
      console.error('[usePushNotifications] Erro ao registrar SW:', err);
      throw err;
    }
  }, []);

  // Solicitar permissão de notificação
  const requestPermission = useCallback(async () => {
    try {
      if (!isSupported) {
        throw new Error('Notificações push não são suportadas');
      }

      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission !== 'granted') {
        throw new Error('Permissão de notificação negada');
      }

      return permission;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao solicitar permissão';
      setError(message);
      throw err;
    }
  }, [isSupported]);

  // Inscrever em notificações push
  const subscribe = useCallback(async () => {
    try {
      if (!isSupported) {
        throw new Error('Notificações push não são suportadas');
      }

      // Registrar Service Worker primeiro
      const registration = await registerServiceWorker();

      // Solicitar permissão
      const permission = await requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permissão de notificação não concedida');
      }

      // Inscrever em push notifications
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      });

      setSubscription(sub);
      setIsSubscribed(true);
      setError(null);

      // Enviar subscription para o servidor
      await fetch('/api/trpc/notifications.subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: sub.endpoint,
            auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('auth') || [])))),
            p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(sub.getKey('p256dh') || [])))),
          },
        }),
      });

      console.log('[usePushNotifications] Inscrito em notificações push');
      return sub;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao inscrever em notificações';
      setError(message);
      console.error('[usePushNotifications] Erro ao inscrever:', err);
      throw err;
    }
  }, [isSupported, registerServiceWorker, requestPermission]);

  // Desinscrever de notificações push
  const unsubscribe = useCallback(async () => {
    try {
      if (!subscription) {
        throw new Error('Não há inscrição ativa');
      }

      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);
      setError(null);

      // Notificar servidor
      await fetch('/api/trpc/notifications.unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });

      console.log('[usePushNotifications] Desinscrição bem-sucedida');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desinscrever';
      setError(message);
      console.error('[usePushNotifications] Erro ao desinscrever:', err);
      throw err;
    }
  }, [subscription]);

  // Enviar notificação local (para teste)
  const sendLocalNotification = useCallback(
    async (options: PushNotificationOptions) => {
      try {
        if (!isSupported || permissionStatus !== 'granted') {
          throw new Error('Notificações não são permitidas');
        }

        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/icon-192x192.png',
          badge: options.badge || '/badge-72x72.png',
          tag: options.tag || 'notification',
          requireInteraction: options.requireInteraction || false,
          data: options.data || {},
          vibrate: [200, 100, 200],
        } as NotificationOptions);

        console.log('[usePushNotifications] Notificação local enviada');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar notificação';
        setError(message);
        console.error('[usePushNotifications] Erro ao enviar notificação:', err);
        throw err;
      }
    },
    [isSupported, permissionStatus]
  );

  // Obter status de inscrição
  const checkSubscription = useCallback(async () => {
    try {
      if (!isSupported) return;

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      
      if (sub) {
        setSubscription(sub);
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('[usePushNotifications] Erro ao verificar inscrição:', err);
    }
  }, [isSupported]);

  // Verificar inscrição ao montar
  useEffect(() => {
    if (isSupported) {
      checkSubscription();
    }
  }, [isSupported, checkSubscription]);

  return {
    isSupported,
    isSubscribed,
    subscription,
    permissionStatus,
    error,
    registerServiceWorker,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
    checkSubscription,
  };
}
