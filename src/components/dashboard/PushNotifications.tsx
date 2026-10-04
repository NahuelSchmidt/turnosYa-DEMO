"use client";

import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAdminView } from '@/hooks/use-is-global-admin';

function IosInstallSteps() {
  return (
    <ol className="list-decimal pl-5 space-y-1 text-sm">
      <li>Abrí este panel en <strong>Safari</strong>.</li>
      <li>Tocá <Share className="inline w-4 h-4 -mt-1" /> <strong>Compartir</strong> y después <strong>“Agregar a inicio”</strong>.</li>
      <li>Abrí Turnify desde el ícono nuevo y volvé acá para activar las notificaciones.</li>
    </ol>
  );
}

/** Tarjeta en Ajustes para activar, probar o desactivar las notificaciones en este dispositivo. */
export function PushNotificationsCard({ tenantId, title, description }: { tenantId: string; title?: string; description?: string }) {
  const adminView = useAdminView();
  const { status, busy, enable, disable, sendTest } = usePushNotifications(adminView ? '' : tenantId);
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const onEnable = async () => {
    try {
      await enable();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'No se pudieron activar', description: e.message });
    }
  };

  const onTest = async () => {
    setTesting(true);
    try {
      const sent = await sendTest();
      toast(sent ? { title: 'Notificación enviada', description: 'Te tendría que llegar en unos segundos.' }
        : { variant: 'destructive', title: 'No hay dispositivos activados' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'No se pudo enviar', description: e.message });
    }
    setTesting(false);
  };

  if (adminView) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> {title || 'Notificaciones en tu celu'}</CardTitle>
        <CardDescription>
          {description || 'Te avisamos al instante cada vez que entra, se paga o se cancela un turno, aunque tengas Turnify cerrado. Activalas en cada celu o compu donde quieras recibirlas.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === 'checking' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}

        {status === 'on' && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Activadas en este dispositivo
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={onTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mandar una de prueba
              </Button>
              <Button variant="ghost" onClick={disable} disabled={busy}>
                <BellOff className="mr-2 h-4 w-4" /> Desactivar
              </Button>
            </div>
          </>
        )}

        {status === 'off' && (
          <Button onClick={onEnable} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Activar notificaciones
          </Button>
        )}

        {status === 'ios-install' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">En iPhone, primero agregá Turnify a tu pantalla de inicio:</p>
            <IosInstallSteps />
          </div>
        )}

        {status === 'denied' && (
          <p className="text-sm text-muted-foreground">
            Bloqueaste las notificaciones de Turnify. Para activarlas, permitilas desde la configuración del navegador
            (el candado al lado de la dirección) o de tu celu, y recargá esta página.
          </p>
        )}

        {status === 'unsupported' && (
          <p className="text-sm text-muted-foreground">Este navegador no permite notificaciones. Probá desde Chrome en Android o en tu compu.</p>
        )}

        {status === 'not-configured' && (
          <p className="text-sm text-muted-foreground">Las notificaciones todavía no están disponibles.</p>
        )}
      </CardContent>
    </Card>
  );
}

const DISMISS_KEY = 'turnify-push-prompt-dismissed';

/** Aviso chico arriba de la agenda para que el dueño active las notificaciones. */
export function PushNotificationsPrompt({ tenantId }: { tenantId: string }) {
  const adminView = useAdminView();
  const { status, busy, enable } = usePushNotifications(adminView ? '' : tenantId);
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === '1'); } catch { setDismissed(false); }
  }, []);

  if (adminView || dismissed || (status !== 'off' && status !== 'ios-install')) return null;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const onEnable = async () => {
    try {
      await enable();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'No se pudieron activar', description: e.message });
    }
  };

  return (
    <div className="rounded-2xl border bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <Bell className="w-5 h-5 text-primary shrink-0 hidden sm:block" />
      <div className="flex-1 text-sm">
        <p className="font-bold">Que te suene cada turno nuevo</p>
        {status === 'ios-install' ? (
          <div className="text-muted-foreground mt-1"><IosInstallSteps /></div>
        ) : (
          <p className="text-muted-foreground">Activá las notificaciones y te avisamos al instante, aunque tengas Turnify cerrado.</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {status === 'off' && (
          <Button size="sm" onClick={onEnable} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Activar
          </Button>
        )}
        <Button size="icon" variant="ghost" onClick={dismiss} aria-label="Cerrar aviso">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
