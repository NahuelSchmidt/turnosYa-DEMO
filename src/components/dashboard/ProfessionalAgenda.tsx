"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Appointment, Service, Professional } from '@/lib/data';
import { format, isToday, isThisWeek, startOfWeek, addDays, isSameDay, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Loader2, User, Clock, Phone, MessageCircle, List, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { NewAppointmentModal } from './NewAppointmentModal';
import { parseFirestoreDate } from '@/lib/utils';
import { useSalon } from '@/hooks/use-salon';
import { usePlan } from '@/hooks/use-plan';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppStatus = 'confirmed' | 'completed' | 'cancelled' | 'no-show';

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

interface ProfessionalAgendaProps { tenantId: string; }

const PROD_DOMAIN = 'https://saas-turnos-ya.vercel.app';

const STATUS_CONFIG: Record<AppStatus, { label: string; cardClass: string; borderClass: string; badgeClass: string; timeClass: string; icon: any }> = {
  confirmed:  {
    label: 'Pendiente',
    cardClass: 'bg-amber-50 dark:bg-amber-950/20',
    borderClass: 'border-l-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-300',
    timeClass: 'text-amber-700 dark:text-amber-400',
    icon: AlertCircle,
  },
  completed:  {
    label: 'Completado',
    cardClass: 'bg-green-50 dark:bg-green-950/20',
    borderClass: 'border-l-green-400',
    badgeClass: 'bg-green-100 text-green-700 border-green-300',
    timeClass: 'text-green-700 dark:text-green-400',
    icon: CheckCircle2,
  },
  cancelled:  {
    label: 'Cancelado',
    cardClass: 'bg-red-50 dark:bg-red-950/20',
    borderClass: 'border-l-red-400',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
    timeClass: 'text-red-700 dark:text-red-400',
    icon: XCircle,
  },
  'no-show':  {
    label: 'No asistió',
    cardClass: 'bg-gray-50 dark:bg-gray-800/20',
    borderClass: 'border-l-gray-400',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-300',
    timeClass: 'text-gray-500',
    icon: XCircle,
  },
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

// ─── STATUS DROPDOWN ─────────────────────────────────────────────────────────
function StatusBadge({ apt, onUpdate, tenantId }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const status = (apt.status as AppStatus) || 'confirmed';
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const isInPast = isPast(parseFirestoreDate(apt.startTime));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all hover:opacity-80 shrink-0",
          cfg.badgeClass
        )}>
          <Icon className="w-3 h-3" />
          {cfg.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* Opciones sin avisar */}
        {(['completed', 'no-show'] as AppStatus[]).filter(k => k !== status).map(key => {
          const val = STATUS_CONFIG[key];
          const ItemIcon = val.icon;
          return (
            <DropdownMenuItem key={key} onClick={() => onUpdate(apt.id, key)} className="flex items-center gap-2 cursor-pointer">
              <ItemIcon className="w-4 h-4" />
              <span>{val.label}</span>
            </DropdownMenuItem>
          );
        })}
        {status !== 'confirmed' && !isInPast && (
          <DropdownMenuItem onClick={() => onUpdate(apt.id, 'confirmed')} className="flex items-center gap-2 cursor-pointer">
            <AlertCircle className="w-4 h-4" />
            <span>Pendiente</span>
          </DropdownMenuItem>
        )}

        {/* Cancelar — dos opciones */}
        {status !== 'cancelled' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                openCancelWhatsApp(apt, tenantId);
                onUpdate(apt.id, 'cancelled');
              }}
              className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancelar y avisar al cliente</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onUpdate(apt.id, 'cancelled')}
              className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancelar sin avisar</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────
function AppointmentCard({ apt, onUpdate, tenantId }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const status = (apt.status as AppStatus) || 'confirmed';
  const cfg = STATUS_CONFIG[status];
  const dateObj = parseFirestoreDate(apt.startTime);
  const whatsappUrl = apt.customerPhone
    ? `https://wa.me/549${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(dateObj, "dd/MM 'a las' HH:mm'hs'", { locale: es })}.`)}`
    : null;

  return (
    <div className={cn(
      "rounded-xl border border-l-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default p-3 space-y-2",
      cfg.cardClass, cfg.borderClass, "hover:brightness-105"
    )}>
      {/* Fila principal: hora + info + acciones compactas */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        {/* Fila superior en mobile: hora + info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Hora */}
          <div className="shrink-0 text-center w-12">
            <p className={cn("text-base font-black tabular-nums leading-none", cfg.timeClass)}>
              {format(dateObj, 'HH:mm')}
            </p>
            <p className="text-[10px] text-muted-foreground">hs</p>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{apt.customerName}</p>
            <p className="text-xs text-muted-foreground truncate">{apt.services.map(s => s.name).join(', ')}</p>
            {apt.professional && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" /> {apt.professional.name}
              </p>
            )}
          </div>
        </div>

        {/* Acciones: segunda fila en mobile, misma fila en desktop */}
        <div className="flex items-center gap-2 flex-wrap">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="w-3 h-3" />
              Enviar recordatorio
            </a>
          )}
          {apt.customerPhone && (
            <a href={`tel:${apt.customerPhone}`} className="text-muted-foreground hover:text-foreground transition-colors p-1" title="Llamar">
              <Phone className="w-4 h-4" />
            </a>
          )}
          <StatusBadge apt={apt} onUpdate={onUpdate} tenantId={tenantId} />
        </div>
      </div>
    </div>
  );
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ agenda, onUpdate, tenantId }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const now = new Date();
  const in7days = addDays(now, 7);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const todayApts = agenda.filter(a =>
    isToday(parseFirestoreDate(a.startTime)) && a.status === 'confirmed'
  );
  const next7Apts = agenda.filter(a => {
    const d = parseFirestoreDate(a.startTime);
    return d > now && !isToday(d) && d <= in7days && a.status === 'confirmed';
  });
  const restOfMonthApts = agenda.filter(a => {
    const d = parseFirestoreDate(a.startTime);
    return d > in7days && d <= endOfMonth && a.status === 'confirmed';
  });

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">
          Hoy · {format(new Date(), "dd 'de' MMMM", { locale: es })} ({todayApts.length})
        </h3>
        {todayApts.length > 0
          ? <div className="space-y-2">{todayApts.map(a => <AppointmentCard key={a.id} apt={a} onUpdate={onUpdate} tenantId={tenantId} />)}</div>
          : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para hoy.</p>}
      </section>

      <section>
        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Próximos 7 días ({next7Apts.length})</h3>
        {next7Apts.length > 0 ? (
          <div className="space-y-2">
            {next7Apts.map(a => (
              <div key={a.id}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                  {format(parseFirestoreDate(a.startTime), "eeee dd/MM", { locale: es })}
                </p>
                <AppointmentCard apt={a} onUpdate={onUpdate} tenantId={tenantId} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para los próximos 7 días.</p>
        )}
      </section>

      <section>
        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Resto del mes ({restOfMonthApts.length})</h3>
        {restOfMonthApts.length > 0 ? (
          <div className="space-y-2">
            {restOfMonthApts.map(a => (
              <div key={a.id}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                  {format(parseFirestoreDate(a.startTime), "eeee dd/MM", { locale: es })}
                </p>
                <AppointmentCard apt={a} onUpdate={onUpdate} tenantId={tenantId} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para el resto del mes.</p>
        )}
      </section>
    </div>
  );
}

// ─── VISTA GRILLA ─────────────────────────────────────────────────────────────
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
const DAYS_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function GridView({ agenda, onUpdate, tenantId }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  tenantId: string;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const getAptsForCell = (day: Date, hour: string) => {
    const [h] = hour.split(':').map(Number);
    return agenda.filter(a => {
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
                <th key={i} className={cn("p-3 font-bold text-center text-xs uppercase tracking-wider", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                  <div>{DAYS_LABELS[i]}</div>
                  <div className={cn("text-lg font-black mt-0.5", isToday(day) ? 'text-primary' : 'text-foreground')}>{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="border-b last:border-0">
                <td className="p-3 text-xs text-muted-foreground font-mono text-right pr-4 align-top pt-3.5">{hour}</td>
                {weekDays.map((day, i) => {
                  const apts = getAptsForCell(day, hour);
                  return (
                    <td key={i} className={cn("p-1.5 align-top border-l", isToday(day) ? 'bg-primary/3' : '')}>
                      <div className="space-y-1">
                      {apts.map(apt => {
                        const status = (apt.status as AppStatus) || 'confirmed';
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <div key={apt.id} className={cn("rounded-lg border-l-4 p-2 text-xs", cfg.cardClass, cfg.borderClass)}>
                            <p className={cn("font-black text-sm leading-none mb-1", cfg.timeClass)}>
                              {format(parseFirestoreDate(apt.startTime), 'HH:mm')}
                            </p>
                            <p className="font-bold truncate">{apt.customerName}</p>
                            <p className="text-muted-foreground truncate text-[10px]">{apt.services.map(s => s.name).join(', ')}</p>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {apt.customerPhone && (
                                <a href={`https://wa.me/549${apt.customerPhone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(parseFirestoreDate(apt.startTime), "dd/MM 'a las' HH:mm'hs'", {locale: es})}.`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-[#25D366] text-[9px] font-bold hover:underline flex items-center gap-0.5">
                                  <MessageCircle className="w-2.5 h-2.5" /> WA
                                </a>
                              )}
                            </div>
                            <select
                              value={apt.status}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'cancelled-notify') {
                                  openCancelWhatsApp(apt, tenantId);
                                  onUpdate(apt.id, 'cancelled');
                                } else {
                                  onUpdate(apt.id, val as AppStatus);
                                }
                              }}
                              className="mt-1.5 w-full text-[9px] rounded border border-input bg-background px-1 py-0.5"
                            >
                              <option value="confirmed">Pendiente</option>
                              <option value="completed">Completado</option>
                              <option value="no-show">No asistió</option>
                              <option value="cancelled">Cancelar sin avisar</option>
                              <option value="cancelled-notify">Cancelar y avisar</option>
                            </select>
                          </div>
                        );
                      })}
                      </div>
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
  const { appointments, updateAppointmentStatus, appointmentsThisMonth, loading: aLoading } = useAppointments(tenantId);
  const { services, loading: sLoading } = useServices(tenantId);
  const { professionals, loading: pLoading } = useProfessionals(tenantId);
  const { salon } = useSalon(tenantId);
  const { features } = usePlan(tenantId);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [localOverrides, setLocalOverrides] = useState<Record<string, AppStatus>>({});
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const loading = aLoading || sLoading || pLoading;

  // Combina datos de Firestore con overrides locales para UI instantánea
  const agenda = (appointments || [])
    .map(apt => ({
      ...apt,
      status: localOverrides[apt.id] || apt.status,
      services: (apt.serviceIds || []).map(id => (services || []).find(s => s.id === id)).filter(Boolean) as Service[],
      professional: (professionals || []).find(p => p.id === apt.professionalId),
    }))
    .sort((a, b) => parseFirestoreDate(a.startTime).getTime() - parseFirestoreDate(b.startTime).getTime()) as PopulatedAppointment[];

  const handleUpdate = (id: string, status: AppStatus) => {
    setLocalOverrides(prev => ({ ...prev, [id]: status }));
    if (updateAppointmentStatus) updateAppointmentStatus(id, status);

    // Si el dueño cancela, notificar al cliente automáticamente
    if (status === 'cancelled') {
      const apt = agenda.find(a => a.id === id);
      if (apt?.customerPhone) {
        const dateObj = parseFirestoreDate(apt.startTime);
        const formattedDate = format(dateObj, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
        const serviceNames = apt.services.map((s: any) => s?.name).join(', ');
        const message = `❌ *Turno Cancelado*\n\nHola ${apt.customerName}, lamentablemente tu turno del ${formattedDate} fue cancelado.\n\n📋 ${serviceNames}\n\nPodés sacar un nuevo turno cuando quieras. ¡Disculpá las molestias!`;
        fetch('/api/whatsapp/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: apt.customerPhone, message, tenantId }),
        });
      }
    }
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
  const hasMonthlyLimit = features.maxAppointmentsPerMonth < 999999;
  const isAtMonthlyLimit = hasMonthlyLimit && appointmentsThisMonth >= features.maxAppointmentsPerMonth;

  return (
    <div className="space-y-6 mt-4">
      {/* Indicador de turnos del mes para plan Basic */}
      {hasMonthlyLimit && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          isAtMonthlyLimit
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-muted/40 border-muted-foreground/20 text-muted-foreground"
        )}>
          {isAtMonthlyLimit && <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>
            <span className="font-bold">{appointmentsThisMonth} / {features.maxAppointmentsPerMonth}</span>
            {" "}turnos este mes
            {isAtMonthlyLimit && " — Límite alcanzado. Tus clientes no pueden reservar nuevos turnos."}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Izquierda: contador + leyenda (leyenda solo en sm+) */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground font-medium">{upcomingCount} próximos</p>
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
            {(Object.entries(STATUS_CONFIG) as [AppStatus, typeof STATUS_CONFIG[AppStatus]][]).map(([key, val]) => {
              const Icon = val.icon;
              return (
                <span key={key} className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", val.badgeClass)}>
                  <Icon className="w-2.5 h-2.5" /> {val.label}
                </span>
              );
            })}
          </div>
        </div>
        {/* Derecha: botones de acción */}
        <div className="flex items-center gap-2">
          {features.hasAdminBooking && (
            <Button size="sm" onClick={() => setShowNewAppointment(true)} className="h-8 px-3">
              <Plus className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo Turno</span>
            </Button>
          )}
          {features.hasWeeklyView && (
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <Button size="sm" variant={view === 'list' ? 'default' : 'ghost'} className="rounded-lg h-8 px-2.5" onClick={() => setView('list')}>
                <List className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
              <Button size="sm" variant={view === 'grid' ? 'default' : 'ghost'} className="rounded-lg h-8 px-2.5" onClick={() => setView('grid')}>
                <LayoutGrid className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Semana</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {view === 'list'
        ? <ListView agenda={agenda} onUpdate={handleUpdate} tenantId={tenantId} />
        : <GridView agenda={agenda} onUpdate={handleUpdate} tenantId={tenantId} />
      }

      <NewAppointmentModal
        open={showNewAppointment}
        onClose={() => setShowNewAppointment(false)}
        tenantId={tenantId}
        services={services || []}
        professionals={professionals || []}
        blockedSlots={(salon as any)?.blockedSlots || []}
      />
    </div>
  );
}
