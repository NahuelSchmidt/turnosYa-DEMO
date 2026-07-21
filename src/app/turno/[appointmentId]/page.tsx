"use client";

import { use, useState } from "react";
import { useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, User, Clock, XCircle, MessageCircle, Loader2, Ban, MapPin } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TZ = "America/Argentina/Buenos_Aires";
const fmtAR = (date: Date, fmt: string) => formatInTimeZone(date, TZ, fmt);
import { parseFirestoreDate } from "@/lib/utils";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSalon } from "@/hooks/use-salon";
import { useAppointments } from "@/hooks/use-appointments";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PROD_DOMAIN = 'https://turnos-ya-demo.vercel.app';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmado",  color: "bg-green-100 text-green-700 border-green-200" },
  cancelled: { label: "Cancelado",   color: "bg-red-100 text-red-700 border-red-200" },
  completed: { label: "Completado",  color: "bg-blue-100 text-blue-700 border-blue-200" },
};

function TurnoContent({ appointmentId }: { appointmentId: string }) {
  const db = useFirestore();
  const [cancelled, setCancelled] = useState(false);

  const aptRef = useMemoFirebase(() => {
    if (!db || !appointmentId) return null;
    return doc(db, "appointments", appointmentId);
  }, [db, appointmentId]);

  const { data: apt, isLoading: aptLoading } = useDoc<any>(aptRef);
  const tenantId = apt?.salonId || "";
  const { services, loading: sLoading } = useServices(tenantId);
  const { professionals, loading: pLoading } = useProfessionals(tenantId);
  const { salon } = useSalon(tenantId);
  const { getClassAttendeeCount } = useAppointments(tenantId);

  if (aptLoading || sLoading || pLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!apt) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Turno no encontrado</h2>
            <p className="text-muted-foreground">El link puede ser incorrecto o el turno fue eliminado.</p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const aptServices = (apt.serviceIds || []).map((id: string) => services.find(s => s.id === id)).filter(Boolean);
  const professional = professionals.find(p => p.id === apt.professionalId);
  const dateObj = parseFirestoreDate(apt.startTime);
  const classService = aptServices.length === 1 ? aptServices[0] : undefined;
  const isClassAppt = classService && (classService as any).type === 'clase';
  const classCount = isClassAppt
    ? getClassAttendeeCount(classService!.id, apt.professionalId, dateObj, format(dateObj, 'HH:mm'))
    : 0;
  const displayAddress = (isClassAppt && (classService as any)?.address) || salon?.address;
  const currentStatus = cancelled ? "cancelled" : apt.status;
  const isCancelled = currentStatus === "cancelled";
  const statusInfo = STATUS_MAP[currentStatus] ?? { label: currentStatus, color: "bg-muted" };
  const hoursUntilAppointment = (dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60);
  const canCancel = hoursUntilAppointment >= 12;

  // Link a la agenda del negocio para volver a reservar
  const host = typeof window !== 'undefined' ? window.location.origin : PROD_DOMAIN;
  const domain = host.includes('localhost') ? PROD_DOMAIN : host;
  const bookLink = `${domain}/book/${tenantId}`;

  const handleCancel = () => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, "appointments", appointmentId), { status: "cancelled", updatedAt: serverTimestamp() });
    setCancelled(true);

    const serviceNames = isClassAppt
      ? `${classService!.name} (cupo ${Math.max(0, classCount - 1)}/${(classService as any)?.capacity || '∞'})`
      : aptServices.map((s: any) => s?.name).join(", ");

    // Notificar al negocio automáticamente
    fetch('/api/whatsapp/notify-cancellation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        customerName: apt.customerName,
        customerPhone: apt.customerPhone,
        appointmentDate: fmtAR(dateObj, "dd/MM 'a las' HH:mm'hs'"),
        serviceNames,
      }),
    });

    // También abrir chat de WhatsApp para que el cliente escriba si quiere
    if (salon?.whatsappNumber) {
      const msg = encodeURIComponent(
        `Hola! ${apt.customerName} canceló su turno del ${fmtAR(dateObj, "dd/MM 'a las' HH:mm'hs'")} (${serviceNames}).`
      );
      setTimeout(() => window.open(`https://wa.me/${salon.whatsappNumber}?text=${msg}`, "_blank"), 600);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-16 flex items-center justify-center">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader className="text-center items-center pb-4">
            <div className={`rounded-full p-4 mb-2 ${isCancelled ? "bg-red-100 dark:bg-red-950/30" : "bg-green-100 dark:bg-green-950/30"}`}>
              {isCancelled ? <XCircle className="w-14 h-14 text-red-500" /> : <CheckCircle2 className="w-14 h-14 text-green-600" />}
            </div>
            <Badge className={`${statusInfo.color} border text-sm px-3 py-1 font-bold`}>{statusInfo.label}</Badge>
            <CardTitle className="text-2xl font-black mt-2 font-headline">{salon?.name || "Tu turno"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Fecha y hora</p>
                  <p className="font-bold capitalize">{fmtAR(dateObj, "eeee dd 'de' MMMM 'a las' HH:mm'hs'")}</p>
                </div>
              </div>
              {professional && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Profesional</p>
                    <p className="font-bold">{professional.name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Servicios</p>
                  <p className="font-bold">{aptServices.map((s: any) => s?.name).join(", ")}</p>
                </div>
              </div>
              {isClassAppt && (
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Cupo</p>
                    <p className="font-bold">{classCount}/{(classService as any)?.capacity || '∞'}</p>
                  </div>
                </div>
              )}
              {displayAddress && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-bold">Ubicación</p>
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(displayAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary underline underline-offset-2 hover:opacity-80"
                    >
                      {displayAddress}
                    </a>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 text-primary shrink-0 font-black text-lg text-center">$</span>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Total</p>
                  <p className="font-bold">${apt.total?.toLocaleString("es-AR")}</p>
                </div>
              </div>
            </div>

            {!isCancelled && (
              canCancel ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
                      <Ban className="mr-2 h-4 w-4" /> Cancelar mi turno
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Cancelar tu turno?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El horario volverá a estar disponible.
                        <span className="flex items-center gap-1.5 mt-3 text-[#25D366] font-medium">
                          <MessageCircle className="w-4 h-4" /> Se avisará al negocio automáticamente.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel}>Sí, cancelar mi turno</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4 text-sm text-center space-y-2">
                  <p className="font-bold text-orange-700 dark:text-orange-400">No podés cancelar este turno</p>
                  <p className="text-orange-600 dark:text-orange-500">
                    Solo se puede cancelar con al menos 12hs de anticipación. Para cancelarlo contactá al negocio directamente.
                  </p>
                  {salon?.whatsappNumber && (
                    <a
                      href={`https://wa.me/${salon.whatsappNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-1 text-[#25D366] font-bold hover:underline"
                    >
                      <MessageCircle className="w-4 h-4" /> Contactar al negocio
                    </a>
                  )}
                </div>
              )
            )}

            {isCancelled && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Tu turno fue cancelado. ¿Querés reservar otro?</p>
                <Button asChild className="w-full">
                  <a href={bookLink}>Sacar nuevo turno</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}

export default function TurnoPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = use(params);
  return <TurnoContent appointmentId={appointmentId} />;
}
