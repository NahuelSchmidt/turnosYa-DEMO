"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Copy, CreditCard, Clock, Landmark, Loader2, LogOut, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EXPIRY_WARNING_DAYS, getSubscriptionState } from "@/lib/subscription-status";
import { SUBSCRIPTION_PRICES, money, type PaidPlanId } from "@/lib/pricing";

// WhatsApp de Turnify para coordinar el pago
const TURNIFY_WHATSAPP = "542216229441";

// Alias de Turnify para cobrar por transferencia. Si no está, se coordina por WhatsApp.
const TRANSFER_ALIAS = process.env.NEXT_PUBLIC_TURNIFY_ALIAS;

// Links de las suscripciones de Mercado Pago (Planes de suscripción), uno por plan.
// Si un plan no tiene link, para ese plan solo se ofrece la transferencia.
const PAID_PLANS = [
  {
    id: "pro" as PaidPlanId,
    name: "Pro",
    mpUrl: process.env.NEXT_PUBLIC_MP_SUBSCRIPTION_URL,
    features: [
      "Hasta 3 profesionales",
      "Turnos ilimitados",
      "Confirmación y recordatorios por WhatsApp",
      "Seña al reservar",
      "Notificaciones en tu celu",
    ],
  },
  {
    id: "premium" as PaidPlanId,
    name: "Premium",
    mpUrl: process.env.NEXT_PUBLIC_MP_SUBSCRIPTION_URL_PREMIUM,
    features: [
      "Profesionales ilimitados",
      "Todo lo del Pro",
      "Múltiples sucursales",
      "Estadísticas avanzadas",
      "Soporte VIP prioritario",
    ],
  },
];

type PaidPlan = (typeof PAID_PLANS)[number];

function transferWhatsAppUrl(plan: PaidPlan, salon: any, email?: string | null) {
  const price = money(SUBSCRIPTION_PRICES[plan.id].transfer);
  const text = [
    TRANSFER_ALIAS
      ? `¡Hola! Te transferí ${price} del plan ${plan.name} de Turnify para mi negocio *${salon?.name || ""}*. Te mando el comprobante.`
      : `¡Hola! Quiero pagar el plan ${plan.name} de Turnify por transferencia (${price}/mes) para mi negocio *${salon?.name || ""}*. ¿Me pasás los datos?`,
    email ? `Mi cuenta: ${email}` : "",
    `ID: ${salon?.id}`,
  ].filter(Boolean).join("\n");
  return `https://wa.me/${TURNIFY_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function TransferBox({ plan, salon }: { plan: PaidPlan; salon: any }) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(TRANSFER_ALIAS || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <div className="rounded-xl border bg-background p-3 space-y-2 text-sm">
      <div className="flex justify-between items-baseline">
        <span className="text-muted-foreground">Transferí</span>
        <span className="font-black text-lg">{money(SUBSCRIPTION_PRICES[plan.id].transfer)}</span>
      </div>
      {TRANSFER_ALIAS && (
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded border bg-muted/40 px-2 py-1.5 font-bold select-all">{TRANSFER_ALIAS}</code>
          <Button type="button" size="sm" variant="outline" onClick={copy} aria-label="Copiar alias">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}
      <Button asChild size="sm" className="w-full font-bold">
        <a href={transferWhatsAppUrl(plan, salon, user?.email)} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" /> {TRANSFER_ALIAS ? "Mandar comprobante por WhatsApp" : "Pedir datos por WhatsApp"}
        </a>
      </Button>
    </div>
  );
}

/** Los planes pagos con sus formas de pago: Mercado Pago (suscripción) o transferencia (más barata). */
function PlanOptions({ salon }: { salon: any }) {
  const { user } = useUser();
  const [transferOpen, setTransferOpen] = useState<string | null>(null);
  // Anota qué negocio va a pagar, para activarlo solo cuando Mercado Pago avise del pago
  const markCheckout = async (plan: PaidPlanId) => {
    try {
      const token = await user?.getIdToken();
      await fetch("/api/subscription/mp-start", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: salon?.id, plan }),
      });
    } catch {}
  };
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {PAID_PLANS.map(plan => {
        const highlighted = plan.id === "pro";
        const prices = SUBSCRIPTION_PRICES[plan.id];
        const showTransfer = transferOpen === plan.id || !plan.mpUrl;
        return (
          <div key={plan.id} className={`rounded-2xl border p-4 flex flex-col gap-3 ${highlighted ? "border-primary bg-primary/5" : "bg-muted/40"}`}>
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-bold">Plan {plan.name}</span>
              <span className="text-xl font-black whitespace-nowrap">{money(plan.mpUrl ? prices.mercadopago : prices.transfer)}<span className="text-xs font-medium text-muted-foreground"> /mes</span></span>
            </div>
            <ul className="space-y-1.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              {plan.mpUrl && (
                <Button asChild className="font-bold" variant={highlighted ? "default" : "secondary"}>
                  <a href={plan.mpUrl} target="_blank" rel="noopener noreferrer" onClick={() => markCheckout(plan.id)}>
                    <CreditCard className="mr-2 h-4 w-4" /> Mercado Pago · {money(prices.mercadopago)}/mes
                  </a>
                </Button>
              )}
              {plan.mpUrl && !showTransfer && (
                <Button type="button" variant="outline" className="font-bold" onClick={() => setTransferOpen(plan.id)}>
                  <Landmark className="mr-2 h-4 w-4" /> Transferencia · {money(prices.transfer)}/mes
                </Button>
              )}
              {showTransfer && <TransferBox plan={plan} salon={salon} />}
              {plan.mpUrl && <p className="text-[11px] text-muted-foreground text-center">Con Mercado Pago se activa al instante y se renueva solo cada mes. Por transferencia pagás mes a mes.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dayLabel(date: Date) {
  return format(date, "EEEE d/MM", { locale: es });
}

/** Aviso chico arriba del panel: días de prueba que quedan, o en rojo cuando se acerca el vencimiento. */
export function TrialBanner({ salon }: { salon: any }) {
  const [open, setOpen] = useState(false);
  const sub = getSubscriptionState(salon);
  const days = sub.daysLeft ?? 99;
  const showTrial = sub.state === "trial";
  const expiringSoon = (sub.state === "trial" || sub.state === "active") && days <= EXPIRY_WARNING_DAYS;
  if (!showTrial && !expiringSoon && sub.state !== "grace") return null;

  const urgent = expiringSoon || sub.state === "grace";
  const planName = salon?.plan === "premium" ? "Premium" : "Pro";
  const when = days <= 1 ? "mañana" : `en ${days} días`;
  const text = sub.state === "grace"
    ? `Venció tu plan ${planName}. Podés seguir usándolo hasta el ${dayLabel(sub.usableUntil!)}.`
    : sub.isTrial
    ? urgent ? `Tu prueba gratis termina ${when}.` : `Prueba gratis del plan Pro: te quedan ${days} días.`
    : `Tu plan ${planName} vence ${when} (${dayLabel(sub.expiresAt!)}).`;

  return (
    <>
      <div className={`rounded-xl border px-3 py-2 flex items-center gap-2 text-xs sm:text-sm ${urgent ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-primary/5 text-muted-foreground"}`}>
        {urgent ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0 text-primary" />}
        <p className="flex-1 font-semibold">{text}</p>
        <button type="button" onClick={() => setOpen(true)} className={`shrink-0 font-bold underline underline-offset-2 ${urgent ? "" : "text-primary"}`}>
          {sub.isTrial ? "Activar plan" : "Pagar ahora"}
        </button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elegí tu plan</DialogTitle>
            <DialogDescription>Sin permanencia: lo podés dar de baja cuando quieras.</DialogDescription>
          </DialogHeader>
          <PlanOptions salon={salon} />
          <p className="text-xs text-muted-foreground">
            Apenas se acredite el pago te activamos el plan.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Terminó la prueba o venció el pago: hay que pagar o pasar al plan gratis para seguir usando el panel. */
export function SubscriptionPaywall({ salon, onLogout }: { salon: any; onLogout?: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [choosingBasic, setChoosingBasic] = useState(false);
  const sub = getSubscriptionState(salon);

  const chooseBasic = async () => {
    setChoosingBasic(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/subscription/choose-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tenantId: salon.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "No se pudo cambiar el plan");
      toast({ title: "Listo, seguís con el plan gratis", description: "Cuando quieras volver a un plan pago, escribinos." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "No se pudo cambiar el plan", description: e.message });
      setChoosingBasic(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <Card className="max-w-2xl w-full shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-black font-headline tracking-tight">
            {sub.isTrial ? "Terminó tu prueba gratis" : `Venció tu plan ${salon?.plan === "premium" ? "Premium" : "Pro"}`}
          </CardTitle>
          <CardDescription className="text-base">
            Para seguir usando Turnify en <strong>{salon?.name}</strong>, elegí un plan o pasate al plan gratis.
            Tus servicios, horarios y turnos quedan guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlanOptions salon={salon} />
          <p className="text-xs text-muted-foreground text-center">
            Apenas se acredite el pago te reactivamos la cuenta.
          </p>

          <div className="text-center space-y-2">
            <Button variant="ghost" onClick={chooseBasic} disabled={choosingBasic}>
              {choosingBasic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Seguir gratis con el plan Basic
            </Button>
            <p className="text-xs text-muted-foreground">1 profesional, hasta 50 turnos por mes y sin WhatsApp automático.</p>
          </div>

          {onLogout && (
            <Button variant="outline" onClick={onLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
