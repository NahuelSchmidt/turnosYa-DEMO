"use client";

import { Service } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { CheckCircle2, Circle, Tag, Percent, Users } from "lucide-react";
import { useSalon } from "@/hooks/use-salon";

interface ServiceSelectorProps {
  allServices: Service[];
  selectedServices: Service[];
  onSelectService: (service: Service) => void;
  tenantId?: string;
}

const WA_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4 mr-2">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ServiceSelector({ allServices, selectedServices, onSelectService, tenantId = "default" }: ServiceSelectorProps) {
  const { salon } = useSalon(tenantId);

  const openWhatsApp = (service: Service) => {
    const phone = salon?.whatsappNumber || "5491112345678";
    const msg = `Hola! Quiero cotizar: ${service.name}. ${service.description}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const servicesList = allServices || [];
  const classServices = servicesList.filter(s => (s as any).type === 'clase');
  const regularServices = servicesList.filter(s => (s as any).type !== 'clase');

  const renderServiceCard = (service: Service) => {
    const sType = (service as any).type;
    const isSelected = selectedServices.some(s => s.id === service.id);

    // WhatsApp — no seleccionable, solo botón
    if (sType === 'whatsapp') {
      return (
        <div key={service.id} className="flex items-center gap-4 rounded-xl border-2 border-border bg-card p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-bold text-foreground">{service.name}</p>
              <Badge className="bg-[#25D366] text-white text-[10px] px-2 py-0 font-bold">WhatsApp</Badge>
            </div>
            {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
          </div>
          <Button onClick={() => openWhatsApp(service)} className="bg-[#25D366] hover:bg-[#20ba58] text-white shrink-0">
            {WA_ICON} Cotizar
          </Button>
        </div>
      );
    }

    // Normal / Combo / Oferta / Clase — seleccionable
    const isCombo = sType === 'combo';
    const isOferta = sType === 'oferta';
    const isClase = sType === 'clase';

    return (
      <div
        key={service.id}
        onClick={() => onSelectService(service)}
        className={`flex items-center gap-3 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 ${
          isSelected
            ? "border-foreground bg-foreground text-background shadow-lg"
            : "border-border bg-card hover:border-foreground/30 hover:bg-muted/50"
        }`}
      >
        <div className="shrink-0">
          {isSelected
            ? <CheckCircle2 className="w-5 h-5 text-background" />
            : <Circle className="w-5 h-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${isSelected ? "text-background" : "text-foreground"}`}>
              {service.name}
            </p>
            {isCombo && !isSelected && (
              <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/30 text-[10px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                <Tag className="w-2.5 h-2.5" /> Combo
              </Badge>
            )}
            {isOferta && !isSelected && (
              <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-950/30 text-[10px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                <Percent className="w-2.5 h-2.5" /> Oferta
              </Badge>
            )}
            {isClase && !isSelected && (service as any).capacity && (
              <Badge variant="outline" className="border-violet-400 text-violet-700 bg-violet-50 dark:bg-violet-950/30 text-[10px] px-1.5 py-0 flex items-center gap-0.5 shrink-0">
                <Users className="w-2.5 h-2.5" /> {(service as any).capacity} cupos
              </Badge>
            )}
          </div>
          {service.description && (
            <p className={`text-xs mt-0.5 ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
              {service.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 ml-1">
          <p className={`font-bold text-sm ${isSelected ? "text-background" : "text-foreground"}`}>
            ${service.price.toLocaleString("es-AR")}
          </p>
          <p className={`text-xs ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
            {service.duration}min
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-2xl font-bold mb-4 font-headline">Elige tus Servicios</h2>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-5">
          <div className="grid gap-3">
            {regularServices.map(renderServiceCard)}
            {servicesList.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay servicios disponibles.</p>
            )}
          </div>

          {classServices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Clases</h3>
              </div>
              <div className="grid gap-3">
                {classServices.map(renderServiceCard)}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}