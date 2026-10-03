"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Loader2 } from 'lucide-react';
import { SUBSCRIPTION_PRICES, type PaidPlanId, type PaymentMethod } from '@/lib/pricing';

// Precios de lista (lanzamiento); el anual son 10 meses
function suggestedAmount(plan: string, months: number, method: PaymentMethod) {
  const p = SUBSCRIPTION_PRICES[plan as PaidPlanId] || SUBSCRIPTION_PRICES.pro;
  return months === 12 ? p.year : p[method] * months;
}

interface Payment { id: string; amount: number; months: number; plan: string; paidAt: number; periodTo: number | null; }

/** Anotar que un negocio pagó: elige plan y meses, y corre el vencimiento. */
export function RecordPaymentDialog({ salon, onRecorded }: { salon: any; onRecorded?: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const initialPlan = salon.plan && salon.plan !== 'basic' ? salon.plan : 'pro';
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [months, setMonths] = useState(1);
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [amount, setAmount] = useState(String(suggestedAmount(initialPlan, 1, 'transfer')));
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Payment[] | null>(null);

  useEffect(() => { setAmount(String(suggestedAmount(plan, months, method))); }, [plan, months, method]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/payments?salonId=${encodeURIComponent(salon.id)}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({}));
      setHistory(data.payments || []);
    })();
  }, [open, salon.id, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/record-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salonId: salon.id, plan, months, method, amount: Number(amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar');
      toast({ title: 'Pago registrado', description: `${salon.name} queda activo hasta el ${format(new Date(data.expiresAt), "dd 'de' MMMM yyyy", { locale: es })}.` });
      setOpen(false);
      onRecorded?.();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'No se pudo registrar', description: err.message });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg" className="rounded-2xl font-bold" title="Registrar pago">
          <DollarSign className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>{salon.name}: el vencimiento se corre según los meses que pagó.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rp-plan">Plan</Label>
              <select id="rp-plan" value={plan} onChange={e => setPlan(e.target.value)} className="block h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rp-months">Meses</Label>
              <select id="rp-months" value={months} onChange={e => setMonths(Number(e.target.value))} className="block h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value={1}>1 mes</option>
                <option value={3}>3 meses</option>
                <option value={6}>6 meses</option>
                <option value={12}>12 meses (anual)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-method">Cómo pagó</Label>
            <select id="rp-method" value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="block h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="transfer">Transferencia</option>
              <option value="mercadopago">Mercado Pago</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rp-amount">Monto cobrado</Label>
            <div className="flex items-center gap-2">
              <span className="font-bold">$</span>
              <Input id="rp-amount" type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Si le hiciste un descuento, poné lo que te pagó de verdad.</p>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar pago
          </Button>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">Pagos anteriores</p>
            {history === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no registraste pagos.</p>
            ) : (
              <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                {history.map(p => (
                  <li key={p.id} className="flex justify-between gap-2 tabular-nums">
                    <span>{format(new Date(p.paidAt), 'dd/MM/yyyy')} · {p.months} {p.months === 1 ? 'mes' : 'meses'} · {p.plan === 'premium' ? 'Premium' : 'Pro'}</span>
                    <span className="font-bold">${Number(p.amount).toLocaleString('es-AR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
