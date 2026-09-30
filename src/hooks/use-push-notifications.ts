'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMessaging, getToken, deleteToken, isSupported, onMessage } from 'firebase/messaging';
import { useFirebaseApp, useUser } from '@/firebase';

export type PushStatus =
  | 'checking'
  | 'unsupported'      // este navegador no puede recibir notificaciones
  | 'ios-install'      // iPhone: primero hay que agregar Turnify a la pantalla de inicio
  | 'not-configured'   // falta la clave pública en el servidor
  | 'denied'           // el dueño bloqueó las notificaciones
  | 'off'              // se pueden activar
  | 'on';              // activadas en este dispositivo

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const STORAGE_KEY = 'turnify-push-token';
const SW_URL = '/firebase-messaging-sw.js';

function readStoredToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function usePushNotifications(tenantId: string | undefined) {
  const app = useFirebaseApp();
  const { user } = useUser();
  const [status, setStatus] = useState<PushStatus>('checking');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = typeof window !== 'undefined' && 'Notification' in window &&
        'serviceWorker' in navigator && await isSupported().catch(() => false);
      let next: PushStatus;
      if (!VAPID_KEY) next = 'not-configured';
      else if (!supported) next = isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
      else if (Notification.permission === 'denied') next = 'denied';
      else next = Notification.permission === 'granted' && readStoredToken() ? 'on' : 'off';
      if (!cancelled) setStatus(next);
    })();
    return () => { cancelled = true; };
  }, []);

  const authPost = useCallback(async (path: string, body: object) => {
    const idToken = await user?.getIdToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Algo salió mal');
    return data;
  }, [user]);

  const enable = useCallback(async () => {
    if (!tenantId || !VAPID_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      const registration = await navigator.serviceWorker.register(SW_URL);
      const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      await authPost('/api/notifications/register', { tenantId, token });
      storeToken(token);
      setStatus('on');
    } finally {
      setBusy(false);
    }
  }, [app, authPost, tenantId]);

  const disable = useCallback(async () => {
    const token = readStoredToken();
    setBusy(true);
    try {
      if (token && tenantId) await authPost('/api/notifications/unregister', { tenantId, token }).catch(() => {});
      await deleteToken(getMessaging(app)).catch(() => {});
      storeToken(null);
      setStatus('off');
    } finally {
      setBusy(false);
    }
  }, [app, authPost, tenantId]);

  const sendTest = useCallback(async () => {
    if (!tenantId) return 0;
    const data = await authPost('/api/notifications/test', { tenantId });
    return data.sent as number;
  }, [authPost, tenantId]);

  // Con el panel abierto, Firebase no muestra la notificación sola: la mostramos nosotros
  useEffect(() => {
    if (status !== 'on') return;
    let unsubscribe = () => {};
    (async () => {
      const registration = await navigator.serviceWorker.getRegistration(SW_URL).catch(() => undefined);
      unsubscribe = onMessage(getMessaging(app), payload => {
        const title = payload.notification?.title || 'Turnify';
        const body = payload.notification?.body || '';
        const link = payload.data?.link;
        registration?.showNotification(title, { body, icon: '/icon-192.png', data: { link } });
      });
    })();
    return () => unsubscribe();
  }, [app, status]);

  return { status, busy, enable, disable, sendTest };
}
