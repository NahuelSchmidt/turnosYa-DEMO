"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppointments } from "@/hooks/use-appointments";
import { useSchedules } from "@/hooks/use-schedules";
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
}

export function NewAppointmentModal({ open, onClose, tenantId, services, professionals, blockedSlots = [] }: NewAppointmentModalProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [extraDuration, setExtraDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addAppointment, getBookedSlotsForDate } = useAppointments(tenantId);
  const { getSlotsForDate } = useSchedules(tenantId);
  const { toast } = useToast();

  const availableSlots = useMemo(() => getSlotsForDate(selectedDate), [selectedDate, getSlotsForDate]);

  const bookedSlots = useMemo(
    () => getBookedSlotsForDate(selectedProfessionalId || null, selectedDate, availableSlots, blockedSlots),
    [selectedProfessionalId, selectedDate, availableSlots, getBookedSlotsForDate, blockedSlots]
  );

  const freeSlots = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const selectedStr = selectedDate
      ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      : '';
    const isToday = selectedStr === todayStr;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return availableSlots.filter((slot) => {
      if (bookedSlots.includes(slot)) return false;
      if (isToday) {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > nowMinutes;
      }
      return true;
    });
  }, [availableSlots, bookedSlots, selectedDate]);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const total = selectedService?.price ?? 0;
  const totalDuration = (selectedService?.duration ?? 0) + extraDuration;

  const handleSubmit = () => {
    if (!customerName || !selectedProfessionalId || !selectedServiceId || !selectedDate || !selectedTime) {
      toast({ variant: "destructive", title: "Completá todos los campos obligatorios" });
      return;
    }
    setIsSubmitting(true);
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    const id = (addAppointment as any)({
      professionalId: selectedProfessionalId,
      serviceIds: [selectedServiceId],
      startTime,
      endTime,
      total,
      customerName,
      customerPhone,
      paymentMethod: "Gestionado por el negocio",
    });

    if (id) {
      toast({ title: "Turno creado", description: `Turno para ${customerName} agendado correctamente.` });
      handleClose();
    } else {
      toast({ variant: "destructive", title: "Error al crear el turno" });
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setSelectedServiceId("");
    setSelectedProfessionalId("");
    setSelectedDate(new Date());
    setSelectedTime("");
    setExtraDuration(0);
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
            <Label>Servicio</Label>
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
                  freeSlots.map(slot => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))
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
