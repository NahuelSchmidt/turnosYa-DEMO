"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Service, Professional } from "@/lib/data";
import { useAppointments } from "@/hooks/use-appointments";
import { useServices } from "@/hooks/use-services";
import { useProfessionals } from "@/hooks/use-professionals";
import { useSchedules } from "@/hooks/use-schedules";
import { useSalon } from "@/hooks/use-salon";
import ServiceSelector from "./ServiceSelector";
import ProfessionalSelector from "./ProfessionalSelector";
import TimeSlotPicker from "./TimeSlotPicker";
import BookingSummary from "./BookingSummary";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CalendarDays, Check, Loader2, Briefcase } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";

type Step = "services" | "professional" | "time" | "confirm";

interface BookingFlowProps {
  tenantId: string;
}

export default function BookingFlow({ tenantId }: BookingFlowProps) {
  const [step, setStep] = useState<Step>("services");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { addAppointment, getBookedSlotsForDate } = useAppointments(tenantId);
  const { salon } = useSalon(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const { professionals, loading: professionalsLoading } = useProfessionals(tenantId);
  const { getSlotsForDate, loading: schedulesLoading } = useSchedules(tenantId);
  const timeSlots = getSlotsForDate(selectedDate);

  const router = useRouter();
  const { toast } = useToast();

  const total = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  const bookedSlots = useMemo(() => {
    return getBookedSlotsForDate(selectedProfessional?.id ?? null, selectedDate);
  }, [selectedProfessional, selectedDate, getBookedSlotsForDate]);

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const primaryColorStyle = useMemo(() => {
    if (!salon?.primaryColor) return {};
    return {
      "--primary": salon.primaryColor.startsWith("#") ? hexToHsl(salon.primaryColor) : salon.primaryColor,
    } as React.CSSProperties;
  }, [salon?.primaryColor]);

  function hexToHsl(hex: string) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }

  const handleBookingConfirmation = () => {
    if (!selectedProfessional || !selectedDate || !selectedTime || selectedServices.length === 0 || !customerName || !customerPhone) {
      return;
    }

    if (bookedSlots.includes(selectedTime)) {
      toast({
        variant: "destructive",
        title: "Horario no disponible",
        description: "Ese horario se acaba de reservar. Por favor elegí otro.",
      });
      setSelectedTime(null);
      setStep("time");
      return;
    }

    setIsProcessing(true);

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    const appointmentId = addAppointment({
      professionalId: selectedProfessional.id,
      serviceIds: selectedServices.map((s) => s.id),
      startTime,
      endTime,
      total,
      customerName,
      customerPhone,
      paymentMethod: "A coordinar con el negocio",
    });

    if (appointmentId) {
      toast({
        title: "¡Reserva Exitosa!",
        description: "Tu turno ha sido agendado. Redirigiendo...",
      });
      setTimeout(() => {
        router.push(`/confirmation?tenantId=${tenantId}&appointmentId=${appointmentId}`);
      }, 800);
    } else {
      setIsProcessing(false);
      toast({
        variant: "destructive",
        title: "Error al reservar",
        description: "No se pudo confirmar tu turno. Intentá de nuevo.",
      });
    }
  };

  const nextStep = () => {
    if (step === "services" && selectedServices.length > 0) setStep("professional");
    else if (step === "professional" && selectedProfessional) setStep("time");
    else if (step === "time" && selectedDate && selectedTime) setStep("confirm");
    else if (step === "confirm") handleBookingConfirmation();
  };

  const steps = [
    { id: "services", name: "Servicios", icon: Briefcase },
    { id: "professional", name: "Especialista", icon: User },
    { id: "time", name: "Agenda", icon: CalendarDays },
    { id: "confirm", name: "Finalizar", icon: Check },
  ];
  const currentStepIndex = steps.findIndex((s) => s.id === step);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  const isLoading = servicesLoading || professionalsLoading || schedulesLoading;

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-2xl flex items-center justify-center h-[500px]">
        <div className="flex items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-xl text-muted-foreground">Cargando experiencia...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl overflow-hidden" style={primaryColorStyle}>
      <CardHeader className="p-4 border-b bg-card">
        <Progress value={progressPercentage} className="w-full h-2" />
        <div className="flex justify-between items-center mt-4">
          {steps.map((s, index) => (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${index <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${index <= currentStepIndex ? "text-primary" : "text-muted-foreground"}`}>{s.name}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-3">
          <div className="md:col-span-2 p-6 md:p-8 min-h-[400px]">
            {step === "services" && (
              <ServiceSelector
                allServices={services}
                selectedServices={selectedServices}
                tenantId={tenantId}
                onSelectService={(service) => {
                  setSelectedServices((prev) =>
                    prev.find((s) => s.id === service.id)
                      ? prev.filter((s) => s.id !== service.id)
                      : [...prev, service]
                  );
                }}
              />
            )}
            {step === "professional" && (
              <ProfessionalSelector
                allProfessionals={professionals}
                selectedProfessional={selectedProfessional}
                onSelectProfessional={(p) => {
                  setSelectedProfessional(p);
                  setSelectedTime(null);
                }}
              />
            )}
            {step === "time" && (
              <TimeSlotPicker
                timeSlots={timeSlots}
                selectedDate={selectedDate}
                onSelectDate={handleDateChange}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
                bookedSlots={bookedSlots}
              />
            )}
            {step === "confirm" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-2xl font-bold font-headline">Tus Datos</h2>
                <p className="text-muted-foreground text-sm">
                  Completá tus datos para confirmar el turno. El negocio te contactará para coordinar el pago.
                </p>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Juan Pérez"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      placeholder="Ej: 1123456789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      El negocio puede contactarte por este número para recordatorios.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="md:col-span-1 bg-muted/30 p-6 border-t md:border-t-0 md:border-l flex flex-col justify-between">
            <BookingSummary
              services={selectedServices}
              professional={selectedProfessional}
              date={selectedDate}
              time={selectedTime}
              total={total}
              totalDuration={totalDuration}
            />
            <div className="mt-8 flex flex-col gap-3">
              <Button
                size="lg"
                className="h-14 font-bold text-lg rounded-xl shadow-lg"
                onClick={nextStep}
                disabled={
                  isProcessing ||
                  (step === "services" && selectedServices.length === 0) ||
                  (step === "professional" && !selectedProfessional) ||
                  (step === "time" && (!selectedDate || !selectedTime)) ||
                  (step === "confirm" && (!customerName || !customerPhone))
                }
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : step === "confirm" ? "Confirmar Turno" : "Continuar"}
              </Button>
              {step !== "services" && (
                <Button variant="ghost" onClick={() => setStep(steps[currentStepIndex - 1].id as Step)} className="text-muted-foreground">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Volver atrás
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
