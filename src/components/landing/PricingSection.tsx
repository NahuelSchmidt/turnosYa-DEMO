"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PHONE = "542216229441";

const PLANS = [
  {
    name: "Basic",
    price: "14.999",
    priceAnual: "149.990",
    oldPrice: null,
    oldPriceAnual: "179.988",
    savingAnual: "29.998",
    badge: null,
    style: "default" as const,
    features: [
      "1 profesional",
      "Link de reserva propio",
      "Agenda de turnos (vista lista)",
      "Hasta 50 turnos por mes",
      "Soporte por email",
      "✓ Sin costo de configuración",
    ],
    waMsg: "Hola! Me interesa el Plan Basic de TurnosYa. ¿Cómo arranco?",
    btnLabel: "Empezar con Basic",
  },
  {
    name: "Pro",
    price: "29.999",
    priceAnual: "299.990",
    oldPrice: "39.999",
    oldPriceAnual: "359.988",
    savingAnual: "59.998",
    badge: "Más elegido",
    style: "pro" as const,
    features: [
      "Hasta 3 profesionales",
      "Turnos ilimitados",
      "Vista semanal de agenda",
      "Métricas e ingresos",
      "Combos y ofertas",
      "Días y horarios bloqueados",
      "Agregar turnos desde el panel",
      "Soporte por WhatsApp",
      "+ Pago único de configuración",
    ],
    waMsg: "Hola! Me interesa el Plan Pro de TurnosYa. ¿Cómo arranco?",
    btnLabel: "Empezar con Pro",
  },
  {
    name: "Premium",
    price: "49.999",
    priceAnual: "499.990",
    oldPrice: "59.999",
    oldPriceAnual: "599.988",
    savingAnual: "99.998",
    badge: "Mejor valor 🔥",
    style: "premium" as const,
    features: [
      "Profesionales ilimitados",
      "Todo lo del Pro",
      "Color de marca personalizado",
      "Configuración inicial incluida",
      "Capacitación por videollamada (30min)",
      "Acceso anticipado a nuevas features",
      "Soporte VIP prioritario por WhatsApp",
      "+ Pago único de configuración y capacitación",
    ],
    waMsg: "Hola! Me interesa el Plan Premium de TurnosYa. ¿Cómo arranco?",
    btnLabel: "Empezar con Premium",
  },
];

export function PricingSection() {
  const [anual, setAnual] = useState(false);

  return (
    <section className="w-full py-28 border-b bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">PLANES Y PRECIOS</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black font-headline tracking-tighter mb-4">
            Elegí tu plan
          </h2>
          <p className="text-muted-foreground text-xl max-w-xl mx-auto">
            Sin permanencia. Cancelás cuando quieras.
          </p>

          {/* Toggle mensual / anual */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setAnual(false)}
              className={cn(
                "px-5 py-2 rounded-full text-sm font-bold transition-all",
                !anual ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setAnual(true)}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all",
                anual ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anual
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-black transition-colors whitespace-nowrap",
                anual ? "bg-background text-foreground" : "bg-green-100 text-green-700"
              )}>
                2 meses gratis
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch pt-5">
          {PLANS.map((plan) => {
            const waUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(plan.waMsg)}`;
            const isPro = plan.style === "pro";
            const isPremium = plan.style === "premium";
            const displayPrice = anual ? plan.priceAnual : plan.price;
            const displayOldPrice = anual ? plan.oldPriceAnual : plan.oldPrice;

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-6 md:p-8 transition-all",
                  isPro && "bg-foreground text-background border-foreground shadow-2xl md:scale-105 z-10",
                  isPremium && "border-amber-400 shadow-lg shadow-amber-100 dark:shadow-amber-900/20",
                  !isPro && !isPremium && "bg-card hover:shadow-md"
                )}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span
                      className={cn(
                        "text-xs font-black px-4 py-1.5 rounded-full",
                        isPro && "bg-background text-foreground",
                        isPremium && "bg-amber-400 text-amber-900",
                      )}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-6">
                  <p className={cn(
                    "text-sm font-bold uppercase tracking-widest mb-3",
                    isPro ? "text-background/60" : "text-muted-foreground"
                  )}>
                    Plan {plan.name}
                  </p>
                  <div className="flex items-end gap-2 flex-wrap">
                    <span className="text-4xl font-black transition-all duration-300">${displayPrice}</span>
                    <span className={cn("text-sm mb-1.5", isPro ? "text-background/60" : "text-muted-foreground")}>
                      {anual ? "/año" : "/mes"}
                    </span>
                  </div>
                  {displayOldPrice && (
                    <p className={cn("text-sm mt-1 line-through", isPro ? "text-background/40" : "text-muted-foreground/60")}>
                      ${displayOldPrice}
                    </p>
                  )}
                  {anual ? (
                    <p className={cn("text-xs mt-1 font-bold", isPro ? "text-green-300" : "text-green-600")}>
                      Ahorrás ${plan.savingAnual}
                    </p>
                  ) : (
                    <p className={cn(
                      "text-xs mt-2 font-semibold px-2.5 py-1 rounded-lg inline-block",
                      isPro
                        ? "bg-green-500/20 text-green-300"
                        : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    )}>
                      Anual: ${plan.priceAnual}/año · Ahorrás 2 meses
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm">
                      <Check className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        isPro ? "text-background" : isPremium ? "text-amber-500" : "text-primary"
                      )} />
                      <span className={isPro ? "text-background/90" : ""}>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <Button
                  asChild
                  className={cn(
                    "w-full rounded-2xl h-12 font-bold transition-transform hover:scale-105 active:scale-95",
                    isPro && "bg-background text-foreground hover:bg-background/90",
                    isPremium && "border-amber-400 hover:border-amber-500",
                  )}
                  variant={isPro ? "default" : isPremium ? "outline" : "outline"}
                >
                  <a href={waUrl} target="_blank" rel="noopener noreferrer">
                    {plan.btnLabel}
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
