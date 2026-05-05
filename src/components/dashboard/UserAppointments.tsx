"use client";

import { useState, useEffect } from "react";
import { Service, Professional, Appointment } from "@/lib/data";
import { useAppointments } from "@/hooks/use-appointments";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSalon } from "@/hooks/use-salon";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInHours } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, User, Clock, Loader2, MessageCircle } from "lucide-react";
import { parseFirestoreDate } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PopulatedAppointment extends Omit<Appointment, "serviceIds" | "professionalId"> {
  services: Service[];
  professional: Professional | undefined;
}

interface UserAppointmentsProps {
  tenantId: string;
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
  blocked: "No disponible",
};

export function UserAppointments({ tenantId }: UserAppointmentsProps) {
  const { appointments: allAppointments, cancelAppointment, loading: appointmentsLoading, customerId } = useAppointments(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const { professionals, loading: professionalsLoading } = useProfessionals(tenantId);
  const { salon } = useSalon(tenantId);

  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [now, setNow] = useState(new Date());
  const loading = appointmentsLoading || servicesLoading || professionalsLoading;

  useEffect(() => {
    if (!loading && allAppointments) {
      const populated = allAppointments
        .filter((apt) => apt.customerId === customerId)
        .map((apt) => ({
          ...apt,
          services: (apt.serviceIds || []).map((id) => services.find((s) => s.id === id)).filter(Boolean) as Service[],
          professional: professionals.find((p) => p.id === apt.professionalId),
        }));
      setAppointments(populated);
    }
  }, [allAppointments, services, professionals, loading, customerId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = (apt: PopulatedAppointment) => {
    cancelAppointment(apt.id);

    // Aviso al negocio por WhatsApp si tiene número configurado
    if (salon?.whatsappNumber) {
      const dateObj = parseFirestoreDate(apt.startTime);
      const msg = encodeURIComponent(
        `Hola! Te aviso que ${apt.customerName} canceló su turno del ${format(dateObj, "dd/MM 'a las' HH:mm'hs'", { locale: es })} (${apt.services.map((s) => s.name).join(", ")}).`
      );
      setTimeout(() => {
        window.open(`https://wa.me/${salon.whatsappNumber}?text=${msg}`, "_blank");
      }, 500);
    }
  };

  const upcomingAppointments = appointments
    .filter((apt) => apt.status === "confirmed" && parseFirestoreDate(apt.startTime) > now)
    .sort((a, b) => parseFirestoreDate(a.startTime).getTime() - parseFirestoreDate(b.startTime).getTime());

  const pastAppointments = appointments
    .filter((apt) => parseFirestoreDate(apt.startTime) <= now || apt.status === "cancelled")
    .sort((a, b) => parseFirestoreDate(b.startTime).getTime() - parseFirestoreDate(a.startTime).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando tus turnos...</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No tenés turnos reservados todavía.</p>
        <p className="text-sm text-muted-foreground mt-2">Cuando reserves un turno, aparecerá acá.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">Próximas Citas ({upcomingAppointments.length})</h3>
          {upcomingAppointments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {upcomingAppointments.map((apt) => {
                const dateObj = parseFirestoreDate(apt.startTime);
                const canCancel = differenceInHours(dateObj, now) >= 12;
                return (
                  <Card key={apt.id}>
                    <CardHeader>
                      <CardTitle className="text-xl capitalize">
                        {format(dateObj, "eeee, dd 'de' MMMM", { locale: es })}
                      </CardTitle>
                      <CardDescription>a las {format(dateObj, "HH:mm")}hs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {apt.professional && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{apt.professional.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{apt.services.map((s) => s.name).join(", ")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold">${apt.total?.toLocaleString("es-AR")}</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <div className="w-full">
                                <Button variant="destructive" className="w-full" disabled={!canCancel}>
                                  <Trash2 className="w-4 h-4 mr-2" /> Cancelar turno
                                </Button>
                              </div>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          {!canCancel && (
                            <TooltipContent>
                              <p>No se puede cancelar con menos de 12hs de antelación.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Cancelar el turno?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. El horario volverá a estar disponible.
                              {salon?.whatsappNumber && (
                                <span className="flex items-center gap-1.5 mt-3 text-[#25D366] font-medium">
                                  <MessageCircle className="w-4 h-4" />
                                  Se abrirá WhatsApp para avisarle al negocio automáticamente.
                                </span>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Volver</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancel(apt)}>
                              Sí, cancelar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No tenés próximas citas.</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">Historial ({pastAppointments.length})</h3>
          {pastAppointments.length > 0 ? (
            <div className="space-y-3">
              {pastAppointments.map((apt) => {
                const dateObj = parseFirestoreDate(apt.startTime);
                return (
                  <Card key={apt.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-semibold capitalize">{format(dateObj, "PPP", { locale: es })}</p>
                      <p className="text-sm text-muted-foreground">
                        {apt.services.map((s) => s.name).join(", ")}
                        {apt.professional ? ` con ${apt.professional.name}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        apt.status === "completed" ? "secondary"
                        : apt.status === "confirmed" ? "outline"
                        : "destructive"
                      }
                    >
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </Badge>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground">No tenés historial de citas.</p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
