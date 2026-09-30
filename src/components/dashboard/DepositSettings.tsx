"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { useSalon } from '@/hooks/use-salon';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react';
import { computeDepositAmount, DepositConfig, DepositMethod, EXPIRY_OPTIONS, formatExpiry, getDepositConfig } from '@/lib/deposit';

export function DepositSettings({ tenantId }: { tenantId: string }) {
  const { user } = useUser();
  const { salon, updateSalon } = useSalon(tenantId);
  const { toast } = useToast();
  const [config, setConfig] = useState<DepositConfig>(getDepositConfig(null));
  const [busy, setBusy] = useState<'connect' | 'disconnect' | null>(null);

  const connected = !!(salon as any)?.mpConnected;
  const alias: string = (salon as any)?.paymentAlias || '';
  const byTransfer = config.method === 'transfer';
  const canEnable = byTransfer ? !!alias : connected;
  const expiryOptions = EXPIRY_OPTIONS[config.method];

  const setMethod = (method: DepositMethod) => {
    const options = EXPIRY_OPTIONS[method];
    setConfig({ ...config, method, expiryMinutes: options.includes(config.expiryMinutes) ? config.expiryMinutes : options[1] });
  };

  useEffect(() => {
    if (salon) setConfig(getDepositConfig(salon));
  }, [salon]);

  // Resultado de la conexión cuando Mercado Pago nos devuelve al panel
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('mp');
    if (!result) return;
    if (result === 'ok') toast({ title: 'Mercado Pago conectado', description: 'Ya podés activar la seña.' });
    else if (result === 'error') toast({ variant: 'destructive', title: 'No se pudo conectar Mercado Pago', description: 'Probá de nuevo.' });
    const url = new URL(window.location.href);
    url.searchParams.delete('mp');
    window.history.replaceState(null, '', url.toString());
  }, [toast]);

  const authPost = async (path: string) => {
    const token = await user?.getIdToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Algo salió mal');
    return data;
  };

  const connect = async () => {
    setBusy('connect');
    try {
      const { url } = await authPost('/api/mercadopago/connect');
      window.location.href = url;
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'No se pudo conectar', description: e.message });
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy('disconnect');
    try {
      await authPost('/api/mercadopago/disconnect');
      toast({ title: 'Mercado Pago desconectado', description: 'La seña quedó desactivada.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'No se pudo desconectar', description: e.message });
    }
    setBusy(null);
  };

  const save = () => {
    const value = Math.max(0, Number(config.value) || 0);
    if (config.enabled && !canEnable) {
      toast({ variant: 'destructive', title: byTransfer ? 'Cargá primero tu alias de pago' : 'Conectá primero Mercado Pago' });
      return;
    }
    if (config.type === 'percent' && value > 100) {
      toast({ variant: 'destructive', title: 'El porcentaje no puede ser mayor a 100' });
      return;
    }
    updateSalon({ deposit: { ...config, value } });
    toast({ title: 'Seña guardada' });
  };

  const example = computeDepositAmount(config, 20000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Seña al reservar</CardTitle>
        <CardDescription>
          Pedile a tus clientes una seña para reservar. Así el que reserva viene, y si no viene, la seña te queda a vos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>¿Cómo la cobrás?</Label>
          <RadioGroup value={config.method} onValueChange={v => setMethod(v as DepositMethod)} className="grid gap-2 sm:grid-cols-2">
            <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${!byTransfer ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="mercadopago" id="deposit-mp" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-semibold block">Mercado Pago</span>
                <span className="text-xs text-muted-foreground">El cliente paga al reservar y el turno se confirma solo.</span>
              </span>
            </label>
            <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${byTransfer ? 'border-primary bg-primary/5' : ''}`}>
              <RadioGroupItem value="transfer" id="deposit-transfer" className="mt-0.5" />
              <span className="text-sm">
                <span className="font-semibold block">Transferencia</span>
                <span className="text-xs text-muted-foreground">Te transfiere al alias y vos confirmás el turno cuando te llega. Sin comisión.</span>
              </span>
            </label>
          </RadioGroup>
        </div>

        {byTransfer ? (
          alias ? (
            <div className="flex items-center gap-2 rounded-xl border p-3 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <span>Se transfiere al alias <strong>{alias}</strong>. Te avisamos por WhatsApp cada vez que alguien reserve, con un link para confirmar.</span>
            </div>
          ) : (
            <p className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm">
              Cargá tu alias o CBU en <strong>WhatsApp del Negocio → Alias o CBU de pago</strong> y guardalo. Es el que le mostramos al cliente para transferir.
            </p>
          )
        ) : connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-green-600" /> Cuenta de Mercado Pago conectada
            </div>
            <Button variant="ghost" size="sm" onClick={disconnect} disabled={busy !== null}>
              {busy === 'disconnect' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Desconectar
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button onClick={connect} disabled={busy !== null}>
              {busy === 'connect' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Conectar Mercado Pago
            </Button>
            <p className="text-xs text-muted-foreground">Vas a entrar a Mercado Pago para autorizar a Turnify a cobrar las señas en tu cuenta.</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="deposit-enabled" className="font-semibold">Pedir seña al reservar</Label>
            <p className="text-xs text-muted-foreground">
              {canEnable
                ? 'Si la desactivás, se reserva sin pagar como siempre.'
                : byTransfer ? 'Primero cargá tu alias de pago.' : 'Primero conectá tu cuenta de Mercado Pago.'}
            </p>
          </div>
          <Switch
            id="deposit-enabled"
            checked={config.enabled && canEnable}
            disabled={!canEnable}
            onCheckedChange={enabled => setConfig({ ...config, enabled })}
          />
        </div>

        <div className="space-y-2">
          <Label>Monto de la seña</Label>
          <RadioGroup
            value={config.type}
            onValueChange={type => setConfig({ ...config, type: type as DepositConfig['type'] })}
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="percent" id="deposit-percent" /> Porcentaje del servicio
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <RadioGroupItem value="fixed" id="deposit-fixed" /> Monto fijo
            </label>
          </RadioGroup>
          <div className="flex items-center gap-2">
            {config.type === 'fixed' && <span className="text-sm font-bold">$</span>}
            <Input
              id="deposit-value"
              type="number"
              min={0}
              max={config.type === 'percent' ? 100 : undefined}
              value={config.value}
              onChange={e => setConfig({ ...config, value: Number(e.target.value) })}
              className="w-32"
            />
            {config.type === 'percent' && <span className="text-sm font-bold">%</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Ejemplo: en un servicio de $20.000 la seña sería de ${example.toLocaleString('es-AR')}. Nunca supera el precio del servicio.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deposit-expiry">Tiempo para pagar</Label>
          <select
            id="deposit-expiry"
            value={config.expiryMinutes}
            onChange={e => setConfig({ ...config, expiryMinutes: Number(e.target.value) })}
            className="block h-10 rounded-md border bg-background px-3 text-sm"
          >
            {expiryOptions.map(m => <option key={m} value={m}>{formatExpiry(m)}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">
            {byTransfer
              ? 'Mientras tanto el horario queda reservado. Si no confirmás la seña en ese tiempo, se libera.'
              : 'Mientras tanto el horario queda reservado. Si no paga a tiempo, se libera.'}
          </p>
        </div>

        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          {byTransfer ? (
            <p><Badge variant="outline" className="mr-1">Importante</Badge> Revisá que la transferencia te haya llegado antes de confirmar el turno. Si un cliente cancela, la devolución la manejás vos según tu política.</p>
          ) : (
            <>
              <p><Badge variant="outline" className="mr-1">Importante</Badge> Mercado Pago cobra su comisión solo sobre la seña, según el plazo de acreditación que elijas en tu cuenta.</p>
              <p>Si un cliente cancela, la devolución de la seña la hacés vos desde Mercado Pago, según tu política.</p>
            </>
          )}
        </div>

        <Button onClick={save} variant="secondary">Guardar seña</Button>
      </CardContent>
    </Card>
  );
}
