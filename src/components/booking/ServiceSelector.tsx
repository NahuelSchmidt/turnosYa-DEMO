"use client";

import { Service } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { MessageSquare, CheckCircle2, Circle } from "lucide-react";

interface ServiceSelectorProps {
  allServices: Service[];
  selectedServices: Service[];
  onSelectService: (service: Service) => void;
}

export default function ServiceSelector({
  allServices,
  selectedServices,
  onSelectService,
}: ServiceSelectorProps) {
  const openWhatsApp = () => {
    const phoneNumber = "5491112345678";
    const message = "Hola, me gustaría cotizar un servicio de tintura.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const servicesList = allServices || [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige tus Servicios</h2>
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-3">
          {servicesList.map((service) => {
            const isSelected = selectedServices.some((s) => s.id === service.id);

            if (service.type === "whatsapp") {
              return (
                <div key={service.id} className="flex items-center space-x-4 rounded-xl border p-4 bg-card">
                  <div className="flex-1">
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20ba58] text-white shrink-0">
                    <MessageSquare className="mr-2 h-4 w-4" /> Cotizar
                  </Button>
                </div>
              );
            }

            return (
              <div
                key={service.id}
                onClick={() => onSelectService(service)}
                className={`flex items-center space-x-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "border-foreground bg-foreground text-background shadow-lg"
                    : "border-border bg-card hover:border-foreground/30 hover:bg-muted/50"
                }`}
              >
                <div className="shrink-0">
                  {isSelected ? (
                    <CheckCircle2 className="w-5 h-5 text-background" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isSelected ? "text-background" : "text-foreground"}`}>
                    {service.name}
                  </p>
                  <p className={`text-sm truncate ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                    {service.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${isSelected ? "text-background" : "text-foreground"}`}>
                    ${service.price.toLocaleString("es-AR")}
                  </p>
                  <p className={`text-xs ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                    {service.duration} min
                  </p>
                </div>
              </div>
            );
          })}
          {servicesList.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No hay servicios disponibles en este momento.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
