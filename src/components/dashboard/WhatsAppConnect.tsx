"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, MessageCircle, RefreshCw } from 'lucide-react';

interface WhatsAppConnectProps { tenantId: string; }

type ConnState = 'loading' | 'notConfigured' | 'notAuthorized' | 'authorized' | 'error';

const POLL_MS = 3000;
const QR_REFRESH_MS = 25000;

export function WhatsAppConnect({ tenantId }: WhatsAppConnectProps) {
  const { user } = useUser();
  const [state, setState] = useState<ConnState>('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState('');
  const lastQrAt = useRef(0);

  const authFetch = useCallback(async (url: string, init?: RequestInit) => {
    const token = await user?.getIdToken();
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` },
    });
  }, [user]);

  const checkStatus = useCallback(async (): Promise<ConnState> => {
    try {
      const res = await authFetch(`/api/whatsapp/status/${tenantId}`);
      if (!res.ok) return 'error';
      const data = await res.json();
      return data.state as ConnState;
    } catch {
      return 'error';
    }
  }, [authFetch, tenantId]);

  const fetchQr = useCallback(async () => {
    try {
      const res = await authFetch(`/api/whatsapp/qr/${tenantId}`);
      if (!res.ok) { setMessage('No se pudo obtener el código QR. Reintentá.'); return; }
      const data = await res.json();
      setQr(data.base64 || null);
      lastQrAt.current = Date.now();
    } catch {
      setMessage('No se pudo obtener el código QR. Reintentá.');
    }
  }, [authFetch, tenantId]);

  // Estado inicial
  useEffect(() => {
    if (!user) return;
    checkStatus().then(s => setState(s));
  }, [user, checkStatus]);

  // Mientras se muestra el QR: consultar estado y renovar el código antes de que venza
  useEffect(() => {
    if (!connecting) return;
    const timer = setInterval(async () => {
      const s = await checkStatus();
      if (s === 'authorized') {
        setState('authorized');
        setConnecting(false);
        setQr(null);
        return;
      }
      if (Date.now() - lastQrAt.current > QR_REFRESH_MS) fetchQr();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [connecting, checkStatus, fetchQr]);

  const handleConnect = async () => {
    setMessage('');
    setConnecting(true);
    try {
      const res = await authFetch('/api/whatsapp/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || 'No se pudo preparar la conexión.');
        setConnecting(false);
        return;
      }
      setState('notAuthorized');
      await fetchQr();
    } catch {
      setMessage('No se pudo preparar la conexión.');
      setConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" /> Conexión de WhatsApp
        </CardTitle>
        <CardDescription>
          Vinculá el WhatsApp del negocio para enviar confirmaciones y recordatorios automáticos a tus clientes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === 'loading' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Verificando conexión...
          </div>
        )}

        {state === 'authorized' && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-sm">WhatsApp conectado</span>
            <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">Activo</Badge>
          </div>
        )}

        {state !== 'loading' && state !== 'authorized' && !connecting && (
          <>
            <p className="text-sm text-muted-foreground">
              {state === 'error'
                ? 'No pudimos verificar el estado de la conexión. Podés intentar conectar igual.'
                : 'Todavía no hay un WhatsApp conectado.'}
            </p>
            <Button onClick={handleConnect}>
              <MessageCircle className="w-4 h-4 mr-2" /> Conectar WhatsApp
            </Button>
          </>
        )}

        {connecting && (
          <div className="space-y-3">
            <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
              <li>Abrí WhatsApp en el celular del negocio.</li>
              <li>Entrá a <span className="font-semibold text-foreground">Dispositivos vinculados</span> y tocá <span className="font-semibold text-foreground">Vincular un dispositivo</span>.</li>
              <li>Escaneá este código QR.</li>
            </ol>
            <div className="flex items-center justify-center rounded-xl border bg-white p-3 w-64 h-64">
              {qr
                ? <img src={qr} alt="Código QR de WhatsApp" className="w-full h-full" />
                : <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchQr}>
                <RefreshCw className="w-4 h-4 mr-2" /> Actualizar QR
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setConnecting(false); setQr(null); }}>
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">El código se renueva solo. Cuando lo escanees, esta pantalla se actualiza sola.</p>
          </div>
        )}

        {message && <p className="text-sm text-destructive">{message}</p>}
      </CardContent>
    </Card>
  );
}
