"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments } from "@/hooks/use-appointments";
import { useSchedules } from "@/hooks/use-schedules";
import { useSalon } from "@/hooks/use-salon";
import { Service, Professional } from "@/lib/data";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  services: Service[];
  professionals: Professional[];
  blockedSlots?: { date: string; time: string }[];
  defaultDate?: Date;
}

export function NewAppointmentModal({ open, onClose, tenantId, services, professionals, blockedSlots = [], defaultDate }: NewAppointmentModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate ?? new Date());

  useEffect(() => {
    if (open) setSelectedDate(defaultDate ?? new Date());
  }, [open, defaultDate]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [extraDuration, setExtraDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [freeTextService, setFreeTextService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState("");

  const { addAppointment, getBookedSlotsForDate, getClassAttendeeCount } = useAppointments(tenantId);
  const { getSlotsForDate } = useSchedules(tenantId);
  const { salon } = useSalon(tenantId);
  const { toast } = useToast();

  const selectedService = services.find(s => s.id === selectedServiceId);
  const isClassBooking = !freeTextService && selectedService?.type === 'clase';

  const availableSlots = useMemo(
    () => getSlotsForDate(selectedDate, undefined, isClassBooking),
    [selectedDate, getSlotsForDate, isClassBooking]
  );

  const bookedSlots = useMemo(
    () => getBookedSlotsForDate(selectedProfessionalId || null, selectedDate, availableSlots, blockedSlots),
    [selectedProfessionalId, selectedDate, availableSlots, getBookedSlotsForDate, blockedSlots]
  );

  const classSlotInfo = useMemo(() => {
    if (!isClassBooking || !selectedProfessionalId || !selectedService) return undefined;
    const capacity = selectedService.capacity ?? 0;
    const result: Record<string, { count: number; capacity: number }> = {};
    availableSlots.forEach((slot) => {
      result[slot] = {
        count: getClassAttendeeCount(selectedService.id, selectedProfessionalId, selectedDate, slot),
        capacity,
      };
    });
    return result;
  }, [isClassBooking, selectedProfessionalId, selectedService, availableSlots, selectedDate, getClassAttendeeCount]);

  const freeSlots = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selectedStr = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : '';
    const isToday = selectedStr === todayStr;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return availableSlots.filter((slot) => {
      if (isClassBooking) {
        const info = classSlotInfo?.[slot];
        if (info && info.count >= info.capacity) return false;
      } else if (bookedSlots.includes(slot)) {
        return false;
      }
      if (isToday) {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > nowMinutes;
      }
      return true;
    });
  }, [availableSlots, bookedSlots, selectedDate, isClassBooking, classSlotInfo]);

  const total = selectedService?.price ?? 0;
  const totalDuration = (selectedService?.duration ?? 0) + extraDuration;

  const handleSubmit = () => {
    const serviceOk = freeTextService ? !!customServiceName.trim() : !!selectedServiceId;
    if (!customerName || !selectedProfessionalId || !serviceOk || !selectedDate || !selectedTime) {
      toast({ variant: "destructive", title: "Completá todos los campos obligatorios" });
      return;
    }
    if (isClassBooking) {
      const info = classSlotInfo?.[selectedTime];
      if (info && info.count >= info.capacity) {
        toast({ variant: "destructive", title: "Cupos agotados", description: "Ese horario se acaba de llenar. Elegí otro." });
        setSelectedTime("");
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = new Date(startTime.getTime() + totalDuration * 60000);

      const id = (addAppointment as any)({
        professionalId: selectedProfessionalId,
        serviceIds: freeTextService ? [] : [selectedServiceId],
        ...(freeTextService ? { customServiceName: customServiceName.trim() } : {}),
        startTime,
        endTime,
        total,
        customerName,
        customerPhone,
        paymentMethod: "Gestionado por el negocio",
      });

      if (id) {
        toast({ title: "Turno creado", description: `Turno para ${customerName} agendado correctamente.` });

        // Enviar WhatsApp de confirmación al cliente si tiene teléfono
        if (customerPhone) {
          const formattedDate = format(startTime, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
          const serviceName = freeTextService ? customServiceName.trim() : (selectedService?.name || '');
          const professional = professionals.find(p => p.id === selectedProfessionalId);
          const turnoLink = `${window.location.origin}/turno/${id}`;
          const locationAddress = (isClassBooking && (selectedService as any)?.address) || (salon as any)?.address;
          const ubicacionLine = locationAddress ? `\n📍 ${locationAddress}` : '';
          const message = `*Turno Confirmado* ✅\n\nHola ${customerName}! Tu turno esta confirmado:\n\n🗓 ${formattedDate}\n📋 ${serviceName}${professional ? `\n👤 Con ${professional.name}` : ''}${ubicacionLine}\n\nGestioná tu turno: ${turnoLink}\n\n¡Te esperamos!`;

          fetch('/api/whatsapp/send-confirmation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: customerPhone,
              message,
              tenantId,
              customerName,
              customerPhone,
              appointmentDate: formattedDate,
              serviceNames: serviceName,
              professionalName: professional?.name,
            }),
          }).then(async (res) => {
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.sent) {
              console.warn('[WhatsApp] Envío automático falló, abriendo wa.me como respaldo', data);
              window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
            }
          }).catch((err) => {
            console.error('[WhatsApp] Error de red al enviar confirmación:', err);
            window.open(`https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
          });
        }

        handleClose();
      } else {
        toast({ variant: "destructive", title: "Error al crear el turno" });
      }
    } catch (error) {
      console.error("Error al crear el turno:", error);
      toast({ variant: "destructive", title: "Error al crear el turno" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setSelectedServiceId("");
    setSelectedProfessionalId("");
    setSelectedDate(defaultDate ?? new Date());
    setSelectedTime("");
    setExtraDuration(0);
    setFreeTextService(false);
    setCustomServiceName("");
    onClose();
  };

  const bookableServices = services.filter(s => s.duration > 0);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Turno</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Nombre del cliente</Label>
            <Input placeholder="Ej: Juan Pérez" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Teléfono <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Input placeholder="Ej: 1123456789" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Servicio</Label>
              <button
                type="button"
                className="text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => { setFreeTextService(v => !v); setSelectedServiceId(""); setCustomServiceName(""); }}
              >
                {freeTextService ? "Elegir de la lista" : "Escribir manualmente"}
              </button>
            </div>
            {freeTextService ? (
              <Input
                placeholder="Ej: Cirugía de encías, Consulta, etc."
                value={customServiceName}
                onChange={e => setCustomServiceName(e.target.value)}
              />
            ) : (
              <Select value={selectedServiceId} onValueChange={v => { setSelectedServiceId(v); setSelectedTime(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio..." />
                </SelectTrigger>
                <SelectContent>
                  {bookableServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.duration}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <Label>Profesional</Label>
            <Select value={selectedProfessionalId} onValueChange={v => { setSelectedProfessionalId(v); setSelectedTime(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar profesional..." />
              </SelectTrigger>
              <SelectContent>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{(p as any).emoji || ''} {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Fecha</Label>
            <div className="flex justify-center border rounded-lg p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={d => { setSelectedDate(d); setSelectedTime(""); }}
                locale={es}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
            {selectedDate && (
              <p className="text-xs text-muted-foreground text-center capitalize">
                {format(selectedDate, "eeee dd 'de' MMMM", { locale: es })}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Hora</Label>
            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={!selectedProfessionalId || !selectedDate}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedProfessionalId ? "Elegí un profesional primero" : "Seleccionar hora..."} />
              </SelectTrigger>
              <SelectContent>
                {freeSlots.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Sin horarios disponibles para este día.</div>
                ) : (
                  freeSlots.map(slot => {
                    const info = isClassBooking ? classSlotInfo?.[slot] : undefined;
                    return (
                      <SelectItem key={slot} value={slot}>
                        {slot}{info ? ` — ${info.count}/${info.capacity} cupos` : ''}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Duración extra <span className="text-muted-foreground text-xs">(minutos, opcional)</span></Label>
            <Input
              type="number"
              min={0}
              step={5}
              placeholder="0"
              value={extraDuration || ""}
              onChange={e => setExtraDuration(Number(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">Usá esto si el turno ocupa más tiempo del normal.</p>
          </div>

          {selectedServiceId && selectedTime && (
            <div className="rounded-lg bg-muted/30 border p-3 text-sm space-y-1">
              <p className="font-bold">Resumen</p>
              <p className="text-muted-foreground">{totalDuration} min · ${total.toLocaleString('es-AR')}</p>
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Turno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
