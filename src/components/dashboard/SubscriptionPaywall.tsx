
"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPaywallProps {
  salonId: string;
  salonName: string;
}

export function SubscriptionPaywall({ salonId, salonName }: SubscriptionPaywallProps) {
  const [isLoading, setIsLoading] = useState(false);
  const db = useFirestore();
  const { toast } = useToast();

  const handleSubscribe = () => {
    setIsLoading(true);
    // Simulación de redirección a Mercado Pago
    setTimeout(() => {
      const salonRef = doc(db, "salons", salonId);
      updateDocumentNonBlocking(salonRef, {
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: serverTimestamp()
      });
      
      toast({
        title: "¡Suscripción Activada!",
        description: "Bienvenido a TurnosYa Pro. Tu acceso ha sido habilitado.",
      });
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4">
      <Card className="max-w-xl w-full shadow-2xl border-primary/20 animate-in zoom-in-95 duration-300">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
            <ShieldCheck className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-4xl font-black font-headline tracking-tighter uppercase italic">
            Suscripción Pendiente
          </CardTitle>
          <CardDescription className="text-lg">
            Para gestionar <strong>{salonName}</strong>, necesitas activar o renovar tu plan mensual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          <div className="bg-muted/50 rounded-2xl p-6 border space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <span className="font-bold">Plan Profesional Mensual</span>
              <span className="text-2xl font-black text-primary">$4.999 / mes</span>
            </div>
            <ul className="space-y-3">
              {[
                "Gestión ilimitada de turnos",
                "Link de reserva personalizado",
                "Reportes de ingresos y métricas",
                "Soporte prioritario 24/7"
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <Button 
              onClick={handleSubscribe} 
              disabled={isLoading}
              className="h-20 rounded-2xl text-2xl font-black uppercase italic shadow-2xl transition-transform hover:scale-105"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
              Pagar con Mercado Pago
            </Button>
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
              Cancela tu suscripción cuando quieras desde el panel de Mercado Pago.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
