"use client";

import { useState } from 'react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Copy, Loader2, Plus, RefreshCw } from 'lucide-react';

function randomPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

const EMPTY = { businessName: '', email: '', password: '', plan: 'pro', trialDays: '7', whatsappNumber: '' };

interface Result {
  salonId: string;
  existingUser: boolean;
  dashboardUrl: string;
  bookingUrl: string;
  email: string;
  password: string;
  trialDays: number;
}

/** Alta de negocio desde el super-admin: usuario del dueño + negocio en un solo paso. */
export function CreateBusinessDialog() {
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => { setForm(EMPTY); setResult(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/create-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, trialDays: Number(form.trialDays) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el negocio');
      setResult({ ...data, email: form.email.trim().toLowerCase(), password: form.password, trialDays: Number(form.trialDays) });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'No se pudo crear', description: err.message });
    }
    setSaving(false);
  };

  const welcome = result ? [
    `¡Listo! Ya tenés tu cuenta de Turnify${result.trialDays ? ` (${result.trialDays} días gratis)` : ''}:`,
    '',
    `Panel: ${result.dashboardUrl}`,
    `Mail: ${result.email}`,
    result.existingUser ? 'Clave: la misma que ya usás' : `Clave: ${result.password}`,
    '',
    `Tu link de reservas para compartir: ${result.bookingUrl}`,
  ].join('\n') : '';

  const copyWelcome = async () => {
    try {
      await navigator.clipboard.writeText(welcome);
      toast({ title: 'Mensaje copiado' });
    } catch {
      toast({ variant: 'destructive', title: 'No se pudo copiar' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-2xl font-bold">
          <Plus className="mr-2 h-5 w-5" /> Nuevo negocio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /> Negocio creado</DialogTitle>
              <DialogDescription>
                {result.existingUser
                  ? 'Ese mail ya tenía cuenta: le sumamos este negocio y su clave no cambió.'
                  : 'Ya puede entrar con este mail y esta clave. Mandale este mensaje:'}
              </DialogDescription>
            </DialogHeader>
            <pre className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-3 text-sm font-sans">{welcome}</pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyWelcome}><Copy className="mr-2 h-4 w-4" /> Copiar mensaje</Button>
              <Button variant="outline" asChild><a href={result.bookingUrl} target="_blank" rel="noopener noreferrer">Ver página de reservas</a></Button>
              <Button variant="ghost" onClick={reset}>Crear otro</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Los servicios, profesionales y horarios los carga el dueño desde Ajustes, o vos entrando a su panel.
            </p>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Nuevo negocio</DialogTitle>
              <DialogDescription>Crea la cuenta del dueño y el negocio de una.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="nb-name">Nombre del negocio</Label>
              <Input id="nb-name" required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="Ej: Peluquería Canina Firulais" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-email">Mail del dueño</Label>
              <Input id="nb-email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="dueño@gmail.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-pass">Clave</Label>
              <div className="flex gap-2">
                <Input id="nb-pass" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="font-mono" />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, password: randomPassword() })} title="Generar clave">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Si el mail ya tiene cuenta, se le suma el negocio y la clave no cambia.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nb-plan">Plan</Label>
                <select id="nb-plan" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} className="block h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nb-trial">Prueba gratis</Label>
                <select id="nb-trial" value={form.trialDays} onChange={e => setForm({ ...form, trialDays: e.target.value })} className="block h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="0">Sin prueba</option>
                  <option value="7">7 días</option>
                  <option value="14">14 días</option>
                  <option value="30">30 días</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nb-wa">WhatsApp del negocio <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input id="nb-wa" value={form.whatsappNumber} onChange={e => setForm({ ...form, whatsappNumber: e.target.value })} placeholder="5491123456789" className="font-mono" />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear negocio
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
