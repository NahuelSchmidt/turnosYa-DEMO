"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, User, Clock, Loader2, ExternalLink, MapPin } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useAppointments } from "@/hooks/use-appointments";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSalon } from "@/hooks/use-salon";
import type { Appointment, Service, Professional } from "@/lib/data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { parseFirestoreDate } from "@/lib/utils";

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

// Dominio real de producción — cambiá si cambia el dominio
const PROD_DOMAIN = 'https://saas-turnos-ya.vercel.app';

function getTurnoLink(appointmentId: string) {
  const host = typeof window !== 'undefined' ? window.location.origin : PROD_DOMAIN;
  const domain = host.includes('localhost') ? PROD_DOMAIN : host;
  return `${domain}/turno/${appointmentId}`;
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const tenantId = searchParams.get("tenantId") || "default";

  const { appointments, loading: aLoading } = useAppointments(tenantId);
  const { services, loading: sLoading } = useServices(tenantId);
  const { professionals, loading: pLoading } = useProfessionals(tenantId);
  const { salon } = useSalon(tenantId);

  const [appointment, setAppointment] = useState<PopulatedAppointment | null>(null);
  const [waSent, setWaSent] = useState(false);
  const loading = aLoading || sLoading || pLoading;

  useEffect(() => {
    if (!loading && appointmentId) {
      const found = appointments.find(a => a.id === appointmentId);
      if (found) {
        setAppointment({
          ...found,
          services: found.serviceIds.map((id: string) => services.find(s => s.id === id)).filter(Boolean) as Service[],
          professional: professionals.find(p => p.id === found.professionalId),
        });
      }
    }
  }, [appointmentId, appointments, services, professionals, loading]);

  // Mandar WA automáticamente (una vez)
  useEffect(() => {
    if (!appointment || waSent) return;
    const { customerPhone, customerName, professional, startTime, services: aptServices } = appointment;
    if (!customerPhone) return;

    const dateObj = parseFirestoreDate(startTime);
    const formattedDate = format(dateObj, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
    const serviceNames = aptServices.map(s => s.name).join(', ');
    const turnoLink = getTurnoLink(appointment.id);

    const ubicacionLine = salon?.address ? `\n📍 Ubicacion: ${salon.address}` : '';
    const cancelLine = salon?.whatsappNumber
      ? `\n\nPara ver, cancelar o reprogramar tu turno, hace clic aca:\n${turnoLink}\n\nTambien podes cancelarlo escribiendonos al ${salon.whatsappNumber} con al menos 12hs de anticipacion.`
      : `\n\nPara ver, cancelar o reprogramar tu turno, hace clic aca:\n${turnoLink}`;
    const aliasLine = (salon as any)?.paymentAlias ? `\n\n💳 Para abonar, usa el siguiente alias: ${(salon as any).paymentAlias}` : '';

    const message = `*Turno Confirmado* ✅\n\nHola ${customerName}! Tu turno esta confirmado:\n\n🗓 ${formattedDate}\n📋 ${serviceNames}${professional ? `\nCon ${professional.name}` : ''}${ubicacionLine}${cancelLine}${aliasLine}\n\n¡Te esperamos!`;

    setWaSent(true);

    // Intentar envío automático vía API
    fetch('/api/whatsapp/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customerPhone, message, tenantId }),
    }).then(res => {
      if (!res.ok) {
        // Fallback: abrir wa.me si la API no está configurada
        window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, "_blank");
      }
    }).catch(() => {
      window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, "_blank");
    });
  }, [appointment, salon, waSent]);

  if (loading || !appointment) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Confirmando tu turno...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const appointmentDate = parseFirestoreDate(appointment.startTime);
  const turnoLink = getTurnoLink(appointment.id);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 md:py-24 flex items-center justify-center">
        <Card className="w-full max-w-2xl text-center shadow-lg">
          <CardHeader className="items-center">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
              <CheckCircle2 className="w-16 h-16 text-green-600" />
            </div>
            <CardTitle className="text-3xl font-bold mt-4 font-headline">¡Turno Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-lg">
              Te enviamos el recordatorio a tu WhatsApp con el link para gestionar tu turno.
            </p>

            <Card className="text-left bg-muted/50">
              <CardContent className="pt-5 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>Fecha:</strong> {format(appointmentDate, "PPP 'a las' HH:mm", { locale: es })}</span>
                </div>
                {appointment.professional && (
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary shrink-0" />
                    <span><strong>Profesional:</strong> {appointment.professional.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <span><strong>Servicios:</strong> {appointment.services.map(s => s.name).join(', ')}</span>
                </div>
                {salon?.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    <span><strong>Ubicación:</strong> {salon.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="bg-muted/30 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">Tu link para ver o cancelar el turno</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate">{turnoLink}</code>
                <Button size="sm" variant="outline" asChild>
                  <a href={turnoLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4" /></a>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" variant="outline" className="flex-1">
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button asChild size="lg" className="flex-1">
                <a href={turnoLink}>Ver mi turno</a>
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
