"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Appointment, Service, Professional } from '@/lib/data';
import { format, isToday, isThisWeek, startOfWeek, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Clock, Ban, Phone, MessageCircle, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseFirestoreDate } from '@/lib/utils';
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

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

interface ProfessionalAgendaProps {
  tenantId: string;
}

function CancelDialog({ onConfirm, clientName, clientPhone, appointmentDate }: { onConfirm: () => void; clientName: string; clientPhone?: string; appointmentDate?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Ban className="mr-1.5 h-3.5 w-3.5" /> Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar este turno?</AlertDialogTitle>
          <AlertDialogDescription>
            Se cancelará el turno de <strong>{clientName}</strong> y el horario quedará disponible nuevamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Sí, cancelar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────

function AppointmentCard({ apt, onCancel }: { apt: PopulatedAppointment; onCancel: (id: string) => void }) {
  const dateObj = parseFirestoreDate(apt.startTime);
  const whatsappUrl = apt.customerPhone
    ? `https://wa.me/549${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(dateObj, "dd/MM 'a las' HH:mm'hs'", { locale: es })}.`)}`
    : null;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-xl tabular-nums">{format(dateObj, 'HH:mm')}hs</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-bold text-lg">{apt.customerName}</span>
          </div>
          {apt.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{apt.customerPhone}</span>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#25D366] hover:underline">
                  <MessageCircle className="w-3.5 h-3.5" /> Recordatorio
                </a>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {apt.professional && (
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{apt.professional.name}</span>
            )}
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{apt.services.map(s => s.name).join(', ')}</span>
          </div>
          <p className="text-sm font-semibold">${apt.total?.toLocaleString('es-AR')}</p>
        </div>
        <CancelDialog onConfirm={() => onCancel(apt.id)} clientName={apt.customerName} clientPhone={apt.customerPhone} appointmentDate={format(parseFirestoreDate(apt.startTime), "dd/MM 'a las' HH:mm'hs'", { locale: es })} />
      </div>
    </Card>
  );
}

function ListView({ agenda, onCancel }: { agenda: PopulatedAppointment[]; onCancel: (id: string) => void }) {
  const todayApts = agenda.filter(a => a.status === 'confirmed' && isToday(parseFirestoreDate(a.startTime)));
  const weekApts = agenda.filter(a =>
    a.status === 'confirmed' &&
    !isToday(parseFirestoreDate(a.startTime)) &&
    isThisWeek(parseFirestoreDate(a.startTime), { weekStartsOn: 1 }) &&
    parseFirestoreDate(a.startTime) > new Date()
  );
  const upcomingApts = agenda.filter(a =>
    a.status === 'confirmed' &&
    !isThisWeek(parseFirestoreDate(a.startTime), { weekStartsOn: 1 }) &&
    parseFirestoreDate(a.startTime) > new Date()
  );

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">
          Hoy · {format(new Date(), "dd 'de' MMMM", { locale: es })} ({todayApts.length})
        </h3>
        {todayApts.length > 0
          ? <div className="space-y-3">{todayApts.map(a => <AppointmentCard key={a.id} apt={a} onCancel={onCancel} />)}</div>
          : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para hoy.</p>
        }
      </section>

      <section>
        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">
          Esta semana ({weekApts.length})
        </h3>
        {weekApts.length > 0 ? (
          <div className="space-y-3">
            {weekApts.map(a => {
              const d = parseFirestoreDate(a.startTime);
              return (
                <div key={a.id}>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                    {format(d, "eeee dd/MM", { locale: es })}
                  </p>
                  <AppointmentCard apt={a} onCancel={onCancel} />
                </div>
              );
            })}
          </div>
        ) : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos esta semana.</p>}
      </section>

      {upcomingApts.length > 0 && (
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Próximamente ({upcomingApts.length})
          </h3>
          <div className="space-y-3">
            {upcomingApts.map(a => {
              const d = parseFirestoreDate(a.startTime);
              return (
                <div key={a.id}>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                    {format(d, "eeee dd/MM", { locale: es })}
                  </p>
                  <AppointmentCard apt={a} onCancel={onCancel} />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── VISTA GRILLA SEMANAL ────────────────────────────────────────────────────

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function GridView({ agenda, onCancel }: { agenda: PopulatedAppointment[]; onCancel: (id: string) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const s = startOfWeek(new Date(), { weekStartsOn: 1 });
    return addDays(s, weekOffset * 7);
  }, [weekOffset]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const confirmed = agenda.filter(a => a.status === 'confirmed');

  const getApt = (day: Date, hour: string) => {
    const [h] = hour.split(':').map(Number);
    return confirmed.find(a => {
      const d = parseFirestoreDate(a.startTime);
      return isSameDay(d, day) && d.getHours() === h;
    });
  };

  return (
    <div className="space-y-4">
      {/* Nav semana */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="font-bold text-sm capitalize">
          {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grilla */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-16 p-3 text-muted-foreground font-medium text-xs"></th>
              {weekDays.map((day, i) => (
                <th key={i} className={`p-3 font-bold text-center text-xs uppercase tracking-wider ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div>{DAYS[i]}</div>
                  <div className={`text-lg font-black mt-0.5 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="border-b last:border-0">
                <td className="p-3 text-xs text-muted-foreground font-mono text-right pr-4 align-top pt-3.5">{hour}</td>
                {weekDays.map((day, i) => {
                  const apt = getApt(day, hour);
                  return (
                    <td key={i} className={`p-1.5 align-top border-l ${isToday(day) ? 'bg-primary/3' : ''}`}>
                      {apt && (
                        <div className="rounded-lg border-l-2 border-primary bg-primary/10 p-2 cursor-default group relative">
                          <p className="font-bold text-xs truncate">{apt.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{apt.services.map(s => s.name).join(', ')}</p>
                          {apt.professional && (
                            <p className="text-[10px] text-muted-foreground truncate">{apt.professional.name}</p>
                          )}
                          <div className="mt-1.5 flex gap-1">
                            {apt.customerPhone && (
                              <a
                                href={`https://wa.me/549${apt.customerPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(parseFirestoreDate(apt.startTime), "dd/MM 'a las' HH:mm'hs'", {locale: es})}.`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-[#25D366] font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <MessageCircle className="w-2.5 h-2.5" /> WA
                              </a>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-[10px] text-destructive font-bold flex items-center gap-0.5 hover:underline ml-auto">
                                  <Ban className="w-2.5 h-2.5" /> Cancelar
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Cancelar este turno?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se cancelará el turno de <strong>{apt.customerName}</strong>.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Volver</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => {
                                    onCancel(apt.id);
                                    if (apt.customerPhone) {
                                      const d = parseFirestoreDate(apt.startTime);
                                      const msg = encodeURIComponent(`Hola ${apt.customerName}! Lamentablemente debemos cancelar tu turno del ${format(d, "dd/MM 'a las' HH:mm'hs'", {locale: es})}. Comunicate con nosotros para reprogramarlo.`);
                                      setTimeout(() => window.open(`https://wa.me/549${apt.customerPhone.replace(/\D/g,'')}?text=${msg}`, '_blank'), 500);
                                    }
                                  }}>
                                    {apt.customerPhone ? 'Cancelar y avisar por WA' : 'Sí, cancelar'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export function ProfessionalAgenda({ tenantId }: ProfessionalAgendaProps) {
  const { appointments, cancelAppointment, loading: appointmentsLoading } = useAppointments(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const { professionals, loading: professionalsLoading } = useProfessionals(tenantId);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [agenda, setAgenda] = useState<PopulatedAppointment[]>([]);
  const loading = appointmentsLoading || servicesLoading || professionalsLoading;

  useEffect(() => {
    if (!loading) {
      const populated = (appointments || [])
        .map(apt => ({
          ...apt,
          services: (apt.serviceIds || []).map(id => (services || []).find(s => s.id === id)).filter(Boolean) as Service[],
          professional: (professionals || []).find(p => p.id === apt.professionalId),
        }))
        .sort((a, b) => parseFirestoreDate(a.startTime).getTime() - parseFirestoreDate(b.startTime).getTime());
      setAgenda(populated);
    }
  }, [appointments, services, professionals, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Toggle vista */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {agenda.filter(a => a.status === 'confirmed' && parseFirestoreDate(a.startTime) > new Date()).length} turnos próximos
        </p>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button
            size="sm"
            variant={view === 'list' ? 'default' : 'ghost'}
            className="rounded-lg h-8 px-3"
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4 mr-1.5" /> Lista
          </Button>
          <Button
            size="sm"
            variant={view === 'grid' ? 'default' : 'ghost'}
            className="rounded-lg h-8 px-3"
            onClick={() => setView('grid')}
          >
            <LayoutGrid className="w-4 h-4 mr-1.5" /> Semana
          </Button>
        </div>
      </div>

      {view === 'list'
        ? <ListView agenda={agenda} onCancel={cancelAppointment} />
        : <GridView agenda={agenda} onCancel={cancelAppointment} />
      }
    </div>
  );
}
