
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, User, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAppointments } from "@/hooks/use-appointments";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import type { Appointment, Service, Professional } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseFirestoreDate } from "@/lib/utils";

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const tenantId = searchParams.get("tenantId") || "default";

  const { appointments, loading: appointmentsLoading } = useAppointments(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const { professionals, loading: professionalsLoading } = useProfessionals(tenantId);

  const [appointment, setAppointment] = useState<PopulatedAppointment | null>(null);

  const loading = appointmentsLoading || servicesLoading || professionalsLoading;

  useEffect(() => {
    if (!loading && appointmentId) {
      const foundAppointment = appointments.find(apt => apt.id === appointmentId);
      if (foundAppointment) {
        const populated = {
          ...foundAppointment,
          services: foundAppointment.serviceIds.map(id => services.find(s => s.id === id)).filter(Boolean) as Service[],
          professional: professionals.find(p => p.id === foundAppointment.professionalId)
        };
        setAppointment(populated);
      }
    }
  }, [appointmentId, appointments, services, professionals, loading]);

  const openWhatsAppReminder = () => {
    if (!appointment) return;
    const { customerPhone, customerName, professional, startTime, services } = appointment;
    const dateObj = parseFirestoreDate(startTime);
    const formattedDate = format(dateObj, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
    const serviceNames = services.map(s => s.name).join(', ');
    const message = `Hola ${customerName}, te recordamos tu turno el ${formattedDate} con ${professional?.name} para ${serviceNames}. ¡Te esperamos en TurnosYa!`;
    const url = `https://wa.me/${customerPhone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (loading || !appointment) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-xl text-muted-foreground">Cargando confirmación...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const appointmentDate = parseFirestoreDate(appointment.startTime);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24 flex items-center justify-center">
        <Card className="w-full max-w-2xl text-center shadow-lg">
          <CardHeader className="items-center">
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold mt-4 font-headline">
              ¡Turno Confirmado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-lg">
              Tu cita ha sido agendada con éxito. Puedes enviarte un recordatorio por WhatsApp.
            </p>
            <Card className="text-left bg-muted/50">
              <CardHeader>
                <CardTitle className="text-xl font-headline">Detalles de la Cita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' HH:mm", { locale: es })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <span><strong>Profesional:</strong> {appointment.professional?.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span><strong>Servicios:</strong> {appointment.services.map(s => s.name).join(', ')}</span>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={openWhatsAppReminder} size="lg">
                <MessageSquare className="mr-2" /> Enviar Recordatorio WhatsApp
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
