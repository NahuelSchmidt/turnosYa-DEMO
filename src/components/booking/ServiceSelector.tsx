"use client";

import { Service } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { MessageSquare } from "lucide-react";

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
    const phoneNumber = "5491112345678"; // Reemplaza con el número de la peluquería
    const message = "Hola, me gustaría cotizar un servicio de tintura.";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  // Aseguramos que allServices sea un array para evitar errores de renderizado
  const servicesList = allServices || [];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige tus Servicios</h2>
      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-4">
          {servicesList.map((service) => {
            const isSelected = selectedServices.some(s => s.id === service.id);

            if (service.type === 'whatsapp') {
                return (
                    <div
                        key={service.id}
                        className="flex items-center space-x-4 rounded-lg border p-4"
                    >
                        <div className="flex-1">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        <Button onClick={openWhatsApp} className="text-white">
                            <MessageSquare className="mr-2 h-4 w-4" /> Cotizar
                        </Button>
                    </div>
                )
            }

            return (
                <div
                    key={service.id}
                    onClick={() => onSelectService(service)}
                    className={`flex items-center space-x-4 rounded-lg border p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-primary/20 border-primary ring-2 ring-primary/20 shadow-md" 
                          : "border-border hover:bg-accent/50"
                    }`}
                >
                    <Checkbox
                        id={`service-${service.id}`}
                        checked={isSelected}
                        onCheckedChange={() => onSelectService(service)}
                        aria-label={`Select ${service.name}`}
                    />
                    <div className="flex-1">
                        <label htmlFor={`service-${service.id}`} className="font-medium cursor-pointer">{service.name}</label>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">${service.price}</p>
                        <p className="text-xs text-muted-foreground">{service.duration} min</p>
                    </div>
                </div>
            )
          })}
          {servicesList.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No hay servicios disponibles en este momento.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
