"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Appointment, Service, Professional } from '@/lib/data';
import { format, isToday, isThisWeek, startOfWeek, addDays, isSameDay, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Clock, Phone, MessageCircle, List, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { parseFirestoreDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type AppStatus = 'confirmed' | 'completed' | 'cancelled' | 'no-show';

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

interface ProfessionalAgendaProps {
  tenantId: string;
}

const PROD_DOMAIN = 'https://saas-turnos-ya.vercel.app';

const STATUS_CONFIG: Record<AppStatus, { label: string; badgeClass: string; icon: any }> = {
  confirmed:  { label: 'Pendiente',    badgeClass: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30',   icon: AlertCircle },
  completed:  { label: 'Completado',   badgeClass: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30',   icon: CheckCircle2 },
  cancelled:  { label: 'Cancelado',    badgeClass: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30',           icon: XCircle },
  'no-show':  { label: 'No asistió',   badgeClass: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/50',       icon: XCircle },
};

function openCancelWhatsApp(apt: PopulatedAppointment, tenantId: string) {
  if (!apt.customerPhone) return;
  const d = parseFirestoreDate(apt.startTime);
  const dateStr = format(d, "dd/MM 'a las' HH:mm'hs'", { locale: es });
  const host = typeof window !== 'undefined' ? window.location.origin : PROD_DOMAIN;
  const domain = host.includes('localhost') ? PROD_DOMAIN : host;
  const bookLink = `${domain}/book/${tenantId}`;
  const msg = encodeURIComponent(
    `Hola ${apt.customerName}! Lamentablemente debemos cancelar tu turno del ${dateStr}. Si querés reservar otro turno podés hacerlo desde acá: ${bookLink}`
  );
  setTimeout(() => window.open(`https://wa.me/549${apt.customerPhone.replace(/\D/g, '')}?text=${msg}`, '_blank'), 400);
}

// ─── STATUS BADGE + DROPDOWN ─────────────────────────────────────────────────
function StatusBadge({ apt, onUpdate, onCancelWA }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  onCancelWA: () => void;
}) {
  const status = (apt.status as AppStatus) || 'confirmed';
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.confirmed;
  const Icon = cfg.icon;
  const aptDate = parseFirestoreDate(apt.startTime);
  const isInPast = isPast(aptDate);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all hover:opacity-80",
          cfg.badgeClass
        )}>
          <Icon className="w-3 h-3" />
          {cfg.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {(Object.entries(STATUS_CONFIG) as [AppStatus, typeof STATUS_CONFIG[AppStatus]][]).map(([key, val]) => {
          const ItemIcon = val.icon;
          if (key === status) return null;
          if (key === 'confirmed' && isInPast) return null; // no volver a pendiente si ya pasó
          return (
            <DropdownMenuItem key={key} onClick={() => {
              if (key === 'cancelled') {
                onCancelWA();
              }
              onUpdate(apt.id, key);
            }} className="flex items-center gap-2 cursor-pointer">
              <ItemIcon className="w-4 h-4" />
              <span>{val.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── APPOINTMENT CARD (lista) ─────────────────────────────────────────────────
function AppointmentCard({ apt, onUpdate, tenantId }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
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
            <div className="flex items-center gap-2 flex-wrap">
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
        <StatusBadge
          apt={apt}
          onUpdate={onUpdate}
          onCancelWA={() => openCancelWhatsApp(apt, tenantId)}
        />
      </div>
    </Card>
  );
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ agenda, onUpdate, tenantId }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const now = new Date();
  const todayApts = agenda.filter(a => isToday(parseFirestoreDate(a.startTime)));
  const weekApts = agenda.filter(a =>
    !isToday(parseFirestoreDate(a.startTime)) &&
    isThisWeek(parseFirestoreDate(a.startTime), { weekStartsOn: 1 }) &&
    parseFirestoreDate(a.startTime) > now &&
    a.status === 'confirmed'
  );
  const upcomingApts = agenda.filter(a =>
    !isThisWeek(parseFirestoreDate(a.startTime), { weekStartsOn: 1 }) &&
    parseFirestoreDate(a.startTime) > now &&
    a.status === 'confirmed'
  );

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">
          Hoy · {format(new Date(), "dd 'de' MMMM", { locale: es })} ({todayApts.length})
        </h3>
        {todayApts.length > 0
          ? <div className="space-y-3">{todayApts.map(a => <AppointmentCard key={a.id} apt={a} onUpdate={onUpdate} tenantId={tenantId} />)}</div>
          : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para hoy.</p>}
      </section>

      <section>
        <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">Esta semana ({weekApts.length})</h3>
        {weekApts.length > 0 ? (
          <div className="space-y-3">
            {weekApts.map(a => (
              <div key={a.id}>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                  {format(parseFirestoreDate(a.startTime), "eeee dd/MM", { locale: es })}
                </p>
                <AppointmentCard apt={a} onUpdate={onUpdate} tenantId={tenantId} />
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos esta semana.</p>}
      </section>

      {upcomingApts.length > 0 && (
        <section>
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground mb-3">Próximamente ({upcomingApts.length})</h3>
          <div className="space-y-3">
            {upcomingApts.map(a => (
              <div key={a.id}>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                  {format(parseFirestoreDate(a.startTime), "eeee dd/MM", { locale: es })}
                </p>
                <AppointmentCard apt={a} onUpdate={onUpdate} tenantId={tenantId} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── VISTA GRILLA ─────────────────────────────────────────────────────────────
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
const DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function GridView({ agenda, onUpdate, tenantId }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const getApt = (day: Date, hour: string) => {
    const [h] = hour.split(':').map(Number);
    return agenda.find(a => {
      const d = parseFirestoreDate(a.startTime);
      return isSameDay(d, day) && d.getHours() === h;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-bold text-sm capitalize">
          {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-16 p-3"></th>
              {weekDays.map((day, i) => (
                <th key={i} className={`p-3 font-bold text-center text-xs uppercase tracking-wider ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div>{DAYS[i]}</div>
                  <div className={`text-lg font-black mt-0.5 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>{format(day, 'd')}</div>
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
                  const status = apt ? ((apt.status as AppStatus) || 'confirmed') : null;
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  return (
                    <td key={i} className={`p-1.5 align-top border-l ${isToday(day) ? 'bg-primary/3' : ''}`}>
                      {apt && cfg && (
                        <div className={cn("rounded-lg border-l-2 p-2", {
                          'border-amber-400 bg-amber-50 dark:bg-amber-950/20': status === 'confirmed',
                          'border-green-500 bg-green-50 dark:bg-green-950/20': status === 'completed',
                          'border-red-400 bg-red-50 dark:bg-red-950/20': status === 'cancelled',
                          'border-gray-400 bg-gray-50 dark:bg-gray-800/30': status === 'no-show',
                        })}>
                          <p className="font-bold text-xs truncate">{apt.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{apt.services.map(s => s.name).join(', ')}</p>
                          <div className="mt-1.5 flex gap-1.5 flex-wrap items-center">
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", cfg.badgeClass)}>
                              {cfg.label}
                            </span>
                            {apt.customerPhone && (
                              <a href={`https://wa.me/549${apt.customerPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(parseFirestoreDate(apt.startTime), "dd/MM 'a las' HH:mm'hs'", {locale: es})}.`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="text-[9px] text-[#25D366] font-bold hover:underline">
                                WA
                              </a>
                            )}
                          </div>
                          {/* Cambiar estado en grilla */}
                          <select
                            value={apt.status}
                            onChange={e => {
                              if (e.target.value === 'cancelled') openCancelWhatsApp(apt, tenantId);
                              onUpdate(apt.id, e.target.value as AppStatus);
                            }}
                            className="mt-1.5 w-full text-[9px] rounded border border-input bg-background px-1 py-0.5"
                          >
                            <option value="confirmed">Pendiente</option>
                            <option value="completed">Completado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="no-show">No asistió</option>
                          </select>
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

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function ProfessionalAgenda({ tenantId }: ProfessionalAgendaProps) {
  const { appointments, cancelAppointment, updateAppointmentStatus, loading: appointmentsLoading } = useAppointments(tenantId);
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

  const handleUpdate = (id: string, status: AppStatus) => {
    if (updateAppointmentStatus) updateAppointmentStatus(id, status);
    // Update local state immediately for snappy UI
    setAgenda(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando agenda...</p>
      </div>
    );
  }

  const upcomingCount = agenda.filter(a => a.status === 'confirmed' && parseFirestoreDate(a.startTime) > new Date()).length;

  return (
    <div className="space-y-6 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">{upcomingCount} turnos próximos</p>
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <span key={key} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", val.badgeClass)}>
                {val.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
          <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} className="rounded-lg h-8 px-3" onClick={() => setView('list')}>
            <List className="w-4 h-4 mr-1.5" /> Lista
          </Button>
          <Button size="sm" variant={view === 'grid' ? 'default' : 'ghost'} className="rounded-lg h-8 px-3" onClick={() => setView('grid')}>
            <LayoutGrid className="w-4 h-4 mr-1.5" /> Semana
          </Button>
        </div>
      </div>

      {view === 'list'
        ? <ListView agenda={agenda} onUpdate={handleUpdate} tenantId={tenantId} />
        : <GridView agenda={agenda} onUpdate={handleUpdate} tenantId={tenantId} />
      }
    </div>
  );
}
