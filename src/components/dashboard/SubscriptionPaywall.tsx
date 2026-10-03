"use client";

import { useState } from "react";
import { useUser } from "@/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, CreditCard, Clock, Loader2, LogOut, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EXPIRY_WARNING_DAYS, getSubscriptionState } from "@/lib/subscription-status";

// WhatsApp de Turnify para coordinar el pago
const TURNIFY_WHATSAPP = "542216229441";
// Link de la suscripción de Mercado Pago (Planes de suscripción). Si no está, solo se ofrece WhatsApp.
const MP_SUBSCRIPTION_URL = process.env.NEXT_PUBLIC_MP_SUBSCRIPTION_URL;
const PRO_PRICE = "$19.900";

const PRO_FEATURES = [
  "Turnos ilimitados",
  "Confirmación y recordatorios automáticos por WhatsApp",
  "Seña al reservar",
  "Notificaciones en tu celu",
  "Métricas, combos y página de perfil",
];

function payWhatsAppUrl(salon: any) {
  const text = `¡Hola! Quiero pagar el plan Pro de Turnify para ${salon?.name || "mi negocio"} (ID: ${salon?.id}).`;
  return `https://wa.me/${TURNIFY_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function PayButtons({ salon, size = "lg" }: { salon: any; size?: "lg" | "sm" }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {MP_SUBSCRIPTION_URL && (
        <Button asChild size={size} className="font-bold">
          <a href={MP_SUBSCRIPTION_URL} target="_blank" rel="noopener noreferrer">
            <CreditCard className="mr-2 h-4 w-4" /> Pagar con Mercado Pago
          </a>
        </Button>
      )}
      <Button asChild size={size} variant={MP_SUBSCRIPTION_URL ? "outline" : "default"} className="font-bold">
        <a href={payWhatsAppUrl(salon)} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" /> {MP_SUBSCRIPTION_URL ? "Pagar por transferencia" : "Quiero pagar el plan Pro"}
        </a>
      </Button>
    </div>
  );
}

function dayLabel(date: Date) {
  return format(date, "EEEE d/MM", { locale: es });
}

/** Aviso chico arriba del panel: días de prueba que quedan, o en rojo cuando se acerca el vencimiento. */
export function TrialBanner({ salon }: { salon: any }) {
  const sub = getSubscriptionState(salon);
  const days = sub.daysLeft ?? 99;
  const showTrial = sub.state === "trial";
  const expiringSoon = (sub.state === "trial" || sub.state === "active") && days <= EXPIRY_WARNING_DAYS;
  if (!showTrial && !expiringSoon && sub.state !== "grace") return null;

  const urgent = expiringSoon || sub.state === "grace";
  const when = days <= 1 ? "mañana" : `en ${days} días`;
  const text = sub.state === "grace"
    ? `Venció tu plan Pro. Podés seguir usándolo hasta el ${dayLabel(sub.usableUntil!)}.`
    : sub.isTrial
    ? urgent ? `Tu prueba gratis termina ${when}.` : `Prueba gratis del plan Pro: te quedan ${days} días.`
    : `Tu plan Pro vence ${when} (${dayLabel(sub.expiresAt!)}).`;
  const payUrl = MP_SUBSCRIPTION_URL || payWhatsAppUrl(salon);

  return (
    <div className={`rounded-xl border px-3 py-2 flex items-center gap-2 text-xs sm:text-sm ${urgent ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300" : "bg-primary/5 text-muted-foreground"}`}>
      {urgent ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0 text-primary" />}
      <p className="flex-1 font-semibold">{text}</p>
      <a href={payUrl} target="_blank" rel="noopener noreferrer" className={`shrink-0 font-bold underline underline-offset-2 ${urgent ? "" : "text-primary"}`}>
        {sub.isTrial ? `Activar Pro (${PRO_PRICE}/mes)` : "Pagar ahora"}
      </a>
    </div>
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
      toast({ title: "Listo, seguís con el plan gratis", description: "Cuando quieras volver al Pro, escribinos." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "No se pudo cambiar el plan", description: e.message });
      setChoosingBasic(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4 py-12">
      <Card className="max-w-lg w-full shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-black font-headline tracking-tight">
            {sub.isTrial ? "Terminó tu prueba gratis" : "Venció tu plan Pro"}
          </CardTitle>
          <CardDescription className="text-base">
            Para seguir usando Turnify en <strong>{salon?.name}</strong>, activá el plan Pro o pasate al plan gratis.
            Tus servicios, horarios y turnos quedan guardados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border bg-muted/40 p-5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="font-bold">Plan Pro</span>
              <span className="text-2xl font-black">{PRO_PRICE}<span className="text-sm font-medium text-muted-foreground"> /mes</span></span>
            </div>
            <ul className="space-y-2">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <PayButtons salon={salon} />
            <p className="text-xs text-muted-foreground">
              Apenas se acredite el pago te reactivamos la cuenta. Si pagás por transferencia, mandanos el comprobante por WhatsApp.
            </p>
          </div>

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
