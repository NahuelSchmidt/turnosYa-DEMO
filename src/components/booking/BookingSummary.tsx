import { Service, Professional } from "@/lib/data";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Clock, Tag, Package, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface BookingSummaryProps {
  services: Service[];
  professional: Professional | null;
  date: Date | undefined;
  time: string | null;
  total: number;
  totalDuration: number;
}

export default function BookingSummary({
  services,
  professional,
  date,
  time,
  total,
  totalDuration,
}: BookingSummaryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold font-headline">Resumen de tu Cita</h3>
      
      {services.length > 0 && (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="w-4 h-4" />
                <h4 className="font-semibold text-foreground">Servicios</h4>
            </div>
            <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
                {services.map((s) => (
                <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span>${s.price}</span>
                </li>
                ))}
            </ul>
        </div>
      )}

      {professional && (
        <div className="flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">Profesional:</span>
            <span className="text-muted-foreground ml-auto">{professional.name}</span>
        </div>
      )}

      {date && time && (
         <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">Fecha:</span>
            <span className="text-muted-foreground ml-auto">{format(date, "PPP", { locale: es })} a las {time}</span>
        </div>
      )}

      <Separator />

      {totalDuration > 0 && (
        <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">Duración Total</span>
            </div>
          <span className="text-muted-foreground">{totalDuration} min</span>
        </div>
      )}
      
      <div className="flex justify-between items-center font-bold text-lg">
        <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span>Total a Pagar</span>
        </div>
        <span>${total}</span>
      </div>
    </div>
  );
}
