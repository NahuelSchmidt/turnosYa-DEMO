"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Appointment, Service, Professional } from '@/lib/data';
import { format, isToday, isThisWeek, startOfWeek, addDays, isSameDay, isPast, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { es as esLocale } from 'date-fns/locale';
import { Loader2, User, Clock, Phone, MessageCircle, List, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle, ChevronDown, Plus, CalendarClock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSchedules } from '@/hooks/use-schedules';
import { NewAppointmentModal } from './NewAppointmentModal';
import { parseFirestoreDate } from '@/lib/utils';
import { useSalon } from '@/hooks/use-salon';
import { usePlan } from '@/hooks/use-plan';
import { useBranches } from '@/hooks/use-branches';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AppStatus = 'confirmed' | 'completed' | 'cancelled' | 'no-show';

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

interface ClassGroup {
  isClassGroup: true;
  key: string;
  startTime: any;
  service: Service;
  professional: Professional | undefined;
  attendees: PopulatedAppointment[];
}

// Agrupa turnos consecutivos de una misma clase (mismo profesional + horario + servicio tipo "clase")
// en un único item con la lista de anotados adentro. Los turnos normales pasan sin agrupar.
function groupClassAppointments(apts: PopulatedAppointment[]): (PopulatedAppointment | ClassGroup)[] {
  const result: (PopulatedAppointment | ClassGroup)[] = [];
  const groupByKey = new Map<string, ClassGroup>();

  apts.forEach(apt => {
    const classService = apt.services.length === 1 ? apt.services[0] : undefined;
    if (!classService || (classService as any).type !== 'clase') {
      result.push(apt);
      return;
    }
    const dateKey = format(parseFirestoreDate(apt.startTime), "yyyy-MM-dd'T'HH:mm");
    const key = `${apt.professional?.id || 'none'}__${classService.id}__${dateKey}`;
    const existing = groupByKey.get(key);
    if (existing) {
      existing.attendees.push(apt);
    } else {
      const group: ClassGroup = {
        isClassGroup: true,
        key,
        startTime: apt.startTime,
        service: classService,
        professional: apt.professional,
        attendees: [apt],
      };
      groupByKey.set(key, group);
      result.push(group);
    }
  });

  return result;
}

interface ProfessionalAgendaProps { tenantId: string; }

const PROD_DOMAIN = 'https://turnos-ya-demo.vercel.app';

const STATUS_CONFIG: Record<AppStatus, { label: string; cardClass: string; borderClass: string; badgeClass: string; timeClass: string; icon: any }> = {
  confirmed:  {
    label: 'Confirmado',
    cardClass: 'bg-green-50 dark:bg-green-950/20',
    borderClass: 'border-l-green-400',
    badgeClass: 'bg-green-100 text-green-700 border-green-300',
    timeClass: 'text-green-700 dark:text-green-400',
    icon: CheckCircle2,
  },
  completed:  {
    label: 'Completado',
    cardClass: 'bg-blue-50 dark:bg-blue-950/20',
    borderClass: 'border-l-blue-400',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
    timeClass: 'text-blue-700 dark:text-blue-400',
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
function StatusBadge({ apt, onUpdate, onReschedule, tenantId }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (apt: PopulatedAppointment) => void;
  tenantId: string;
}) {
  const status = (apt.status as AppStatus) || 'confirmed';
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const isInPast = isPast(parseFirestoreDate(apt.startTime));
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
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
              <span>Confirmado</span>
            </DropdownMenuItem>
          )}
          {status !== 'cancelled' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onReschedule(apt)}
                className="flex items-center gap-2 cursor-pointer text-primary focus:text-primary"
              >
                <CalendarClock className="w-4 h-4" />
                <span>Reprogramar turno</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar turno</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar este turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a cancelar el turno de <strong>{apt.customerName}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, mantener</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => onUpdate(apt.id, 'cancelled')}
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── APPOINTMENT CARD ─────────────────────────────────────────────────────────
function AppointmentCard({ apt, onUpdate, onReschedule, tenantId }: {
  apt: PopulatedAppointment;
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (apt: PopulatedAppointment) => void;
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
          <StatusBadge apt={apt} onUpdate={onUpdate} onReschedule={onReschedule} tenantId={tenantId} />
        </div>
      </div>
    </div>
  );
}

// ─── TARJETA DE CLASE AGRUPADA (cupo + lista de anotados) ────────────────────
function ClassGroupCard({ group, onUpdate, onReschedule, tenantId }: {
  group: ClassGroup;
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (apt: PopulatedAppointment) => void;
  tenantId: string;
}) {
  const dateObj = parseFirestoreDate(group.startTime);
  const capacity = (group.service as any).capacity || 0;
  const confirmedCount = group.attendees.filter(a => (a.status as AppStatus || 'confirmed') === 'confirmed').length;
  const isFull = capacity > 0 && confirmedCount >= capacity;

  return (
    <div className="rounded-xl border-2 border-violet-200 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-950/10 overflow-hidden">
      <div className="flex items-center gap-3 p-3 border-b border-violet-200 dark:border-violet-900/40">
        <div className="shrink-0 text-center w-12">
          <p className="text-base font-black tabular-nums leading-none text-violet-700 dark:text-violet-400">
            {format(dateObj, 'HH:mm')}
          </p>
          <p className="text-[10px] text-muted-foreground">hs</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate flex items-center gap-1.5 flex-wrap">
            {group.service.name}
            <span className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0",
              isFull ? "bg-red-100 text-red-700 border-red-300" : "bg-violet-100 text-violet-700 border-violet-300"
            )}>
              {confirmedCount}/{capacity || '∞'} cupos
            </span>
          </p>
          {group.professional && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" /> {group.professional.name}
            </p>
          )}
        </div>
      </div>
      <div className="divide-y divide-violet-100 dark:divide-violet-900/30">
        {group.attendees.map(apt => {
          const status = (apt.status as AppStatus) || 'confirmed';
          const cfg = STATUS_CONFIG[status];
          const whatsappUrl = apt.customerPhone
            ? `https://wa.me/549${apt.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${apt.customerName}! Te recuerdo tu turno para el ${format(parseFirestoreDate(apt.startTime), "dd/MM 'a las' HH:mm'hs'", { locale: es })}.`)}`
            : null;
          return (
            <div key={apt.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{apt.customerName}</p>
                {apt.customerPhone && <p className="text-xs text-muted-foreground truncate">{apt.customerPhone}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: '#25D366' }}
                    title="Enviar recordatorio"
                  >
                    <MessageCircle className="w-3 h-3" />
                  </a>
                )}
                <StatusBadge apt={apt} onUpdate={onUpdate} onReschedule={onReschedule} tenantId={tenantId} />
              </div>
            </div>
          );
        })}
        {group.attendees.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">Sin anotados.</p>
        )}
      </div>
    </div>
  );
}

// ─── VISTA LISTA ─────────────────────────────────────────────────────────────
function ListView({ agenda, onUpdate, onReschedule, tenantId, getBookedSlotsForDate }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (id: string, newStart: Date, newEnd: Date) => void;
  tenantId: string;
  getBookedSlotsForDate: (professionalId: string | null, date: Date | undefined, slots: string[], blockedSlots: any[], excludeId?: string) => string[];
}) {
  const [rescheduleApt, setRescheduleApt] = useState<PopulatedAppointment | null>(null);
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

  const renderAgendaItem = (item: PopulatedAppointment | ClassGroup) =>
    'isClassGroup' in item
      ? <ClassGroupCard key={item.key} group={item} onUpdate={onUpdate} onReschedule={setRescheduleApt} tenantId={tenantId} />
      : <AppointmentCard key={item.id} apt={item} onUpdate={onUpdate} onReschedule={setRescheduleApt} tenantId={tenantId} />;

  return (
    <>
      <div className="space-y-8">
        <section>
          <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Hoy · {format(new Date(), "dd 'de' MMMM", { locale: es })} ({todayApts.length})
          </h3>
          {todayApts.length > 0
            ? <div className="space-y-2">{groupClassAppointments(todayApts).map(renderAgendaItem)}</div>
            : <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para hoy.</p>}
        </section>

        <section>
          <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-3">Próximos 7 días ({next7Apts.length})</h3>
          {next7Apts.length > 0 ? (
            <div className="space-y-2">
              {groupClassAppointments(next7Apts).map(item => (
                <div key={'isClassGroup' in item ? item.key : item.id}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                    {format(parseFirestoreDate(item.startTime), "eeee dd/MM", { locale: es })}
                  </p>
                  {renderAgendaItem(item)}
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
              {groupClassAppointments(restOfMonthApts).map(item => (
                <div key={'isClassGroup' in item ? item.key : item.id}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 capitalize pl-1">
                    {format(parseFirestoreDate(item.startTime), "eeee dd/MM", { locale: es })}
                  </p>
                  {renderAgendaItem(item)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 border rounded-xl text-center">Sin turnos para el resto del mes.</p>
          )}
        </section>
      </div>

      <AppointmentDetailDialog
        apt={rescheduleApt}
        tenantId={tenantId}
        onUpdate={onUpdate}
        onReschedule={(id, newStart, newEnd) => { onReschedule(id, newStart, newEnd); setRescheduleApt(null); }}
        onClose={() => setRescheduleApt(null)}
        getBookedSlotsForDate={getBookedSlotsForDate}
      />
    </>
  );
}

// ─── DIALOG DETALLE / ACCIONES DE TURNO ──────────────────────────────────────
function AppointmentDetailDialog({ apt, tenantId, onUpdate, onReschedule, onClose, getBookedSlotsForDate }: {
  apt: PopulatedAppointment | null;
  tenantId: string;
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (id: string, newStart: Date, newEnd: Date) => void;
  onClose: () => void;
  getBookedSlotsForDate: (professionalId: string | null, date: Date | undefined, slots: string[], blockedSlots: any[], excludeId?: string) => string[];
}) {
  const [mode, setMode] = useState<'detail' | 'reschedule'>('detail');
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState('');
  const { getSlotsForDate } = useSchedules(tenantId);

  useEffect(() => {
    if (apt) {
      setMode('detail');
      setRescheduleDate(parseFirestoreDate(apt.startTime));
      setRescheduleTime('');
    }
  }, [apt]);

  const slots = useMemo(() => getSlotsForDate(rescheduleDate), [rescheduleDate, getSlotsForDate]);
  const booked = useMemo(
    () => apt ? getBookedSlotsForDate(apt.professional?.id || null, rescheduleDate, slots, [], apt.id) : [],
    [apt, rescheduleDate, slots, getBookedSlotsForDate]
  );
  const freeSlots = useMemo(() => slots.filter(s => !booked.includes(s)), [slots, booked]);

  if (!apt) return null;

  const dateObj = parseFirestoreDate(apt.startTime);
  const status = (apt.status as AppStatus) || 'confirmed';
  const cfg = STATUS_CONFIG[status];

  const handleReschedule = () => {
    if (!rescheduleDate || !rescheduleTime) return;
    const [h, m] = rescheduleTime.split(':').map(Number);
    const newStart = new Date(rescheduleDate);
    newStart.setHours(h, m, 0, 0);
    const duration = apt.endTime
      ? parseFirestoreDate(apt.endTime).getTime() - dateObj.getTime()
      : 60 * 60 * 1000;
    const newEnd = new Date(newStart.getTime() + duration);
    onReschedule(apt.id, newStart, newEnd);

    if (apt.customerPhone) {
      const formattedDate = format(newStart, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: esLocale });
      const serviceName = apt.services.map(s => s.name).join(', ') || (apt as any).customServiceName || '';
      const turnoLink = `${window.location.origin}/turno/${apt.id}`;
      const message = `📅 *Turno Reprogramado*\n\nHola ${apt.customerName}! Tu turno fue reprogramado para:\n\n🗓 ${formattedDate}${serviceName ? `\n📋 ${serviceName}` : ''}${apt.professional ? `\n👤 Con ${apt.professional.name}` : ''}\n\nGestioná tu turno: ${turnoLink}\n\n¡Te esperamos!`;
      fetch('/api/whatsapp/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: apt.customerPhone, message, tenantId }),
      });
    }

    onClose();
  };

  return (
    <Dialog open={!!apt} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === 'detail' ? 'Detalle del turno' : 'Reprogramar turno'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'detail' && (
          <div className="space-y-4">
            {/* Info */}
            <div className={cn("rounded-lg border-l-4 p-3 space-y-1.5", cfg.cardClass, cfg.borderClass)}>
              <p className={cn("font-black text-lg leading-none", cfg.timeClass)}>{format(dateObj, 'HH:mm')}</p>
              <p className="font-bold text-base">{apt.customerName}</p>
              {apt.customerPhone && <p className="text-sm text-muted-foreground">{apt.customerPhone}</p>}
              <p className="text-sm text-muted-foreground">{apt.services.map(s => s.name).join(', ') || (apt as any).customServiceName || '—'}</p>
              {apt.professional && <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{apt.professional.name}</p>}
              <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border", cfg.badgeClass)}>
                {cfg.label}
              </span>
            </div>

            {/* Acciones de estado */}
            {status !== 'cancelled' && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cambiar estado</p>
                <div className="flex flex-wrap gap-2">
                  {(['confirmed', 'completed', 'no-show'] as AppStatus[]).filter(s => s !== status).map(s => (
                    <button
                      key={s}
                      onClick={() => { onUpdate(apt.id, s); onClose(); }}
                      className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80", STATUS_CONFIG[s].badgeClass)}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                  <button
                    onClick={() => { onUpdate(apt.id, 'cancelled'); onClose(); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    Cancelar turno
                  </button>
                </div>
              </div>
            )}

            {/* Reprogramar */}
            {status !== 'cancelled' && (
              <button
                onClick={() => setMode('reschedule')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
              >
                <CalendarClock className="w-4 h-4" />
                Reprogramar turno
              </button>
            )}
          </div>
        )}

        {mode === 'reschedule' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nueva fecha</p>
              <div className="flex justify-center border rounded-lg p-2">
                <Calendar
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={d => { setRescheduleDate(d); setRescheduleTime(''); }}
                  locale={esLocale}
                  disabled={d => d < new Date(new Date().setHours(0,0,0,0))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nuevo horario</p>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime} disabled={!rescheduleDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar hora..." />
                </SelectTrigger>
                <SelectContent>
                  {freeSlots.length === 0
                    ? <div className="px-3 py-2 text-sm text-muted-foreground">Sin horarios disponibles.</div>
                    : freeSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode('detail')}>Volver</Button>
              <Button className="flex-1" disabled={!rescheduleTime} onClick={handleReschedule}>Confirmar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── VISTA GRILLA SEMANAL ─────────────────────────────────────────────────────
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
const DAYS_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function GridView({ agenda, onUpdate, onReschedule, tenantId, initialWeekOffset = 0, onDayClick, getBookedSlotsForDate }: {
  agenda: PopulatedAppointment[];
  onUpdate: (id: string, status: AppStatus) => void;
  onReschedule: (id: string, newStart: Date, newEnd: Date) => void;
  tenantId: string;
  initialWeekOffset?: number;
  onDayClick?: (day: Date) => void;
  getBookedSlotsForDate: (professionalId: string | null, date: Date | undefined, slots: string[], blockedSlots: any[], excludeId?: string) => string[];
}) {
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [selectedApt, setSelectedApt] = useState<PopulatedAppointment | null>(null);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-bold text-sm capitalize">
          {format(weekStart, "d 'de' MMMM", { locale: es })} — {format(addDays(weekStart, 6), "d 'de' MMMM", { locale: es })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[600px] border-collapse text-xs table-fixed">
          <colgroup>
            <col style={{ width: 40 }} />
            {weekDays.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-10 p-1"></th>
              {weekDays.map((day, i) => (
                <th key={i} className={cn("p-1 font-bold text-center text-[10px] uppercase tracking-wider", isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                  <div>{DAYS_LABELS[i]}</div>
                  <div className={cn("text-sm font-black mt-0.5", isToday(day) ? 'text-primary' : 'text-foreground')}>{format(day, 'd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour} className="border-b last:border-0" style={{ height: 48 }}>
                <td className="text-[9px] text-muted-foreground font-mono text-right pr-1.5 align-middle w-10">{hour}</td>
                {weekDays.map((day, i) => {
                  const apts = getAptsForCell(day, hour);
                  return (
                    <td key={i} className={cn("px-0.5 border-l overflow-hidden", isToday(day) ? 'bg-primary/3' : '')} style={{ height: 48, maxHeight: 48 }}>
                      {apts.map(apt => {
                        const status = (apt.status as AppStatus) || 'confirmed';
                        const cfg = STATUS_CONFIG[status];
                        const serviceName = apt.services.map(s => s.name).join(', ') || (apt as any).customServiceName || '';
                        return (
                          <button
                            key={apt.id}
                            onClick={() => setSelectedApt(apt)}
                            style={{ height: 44 }}
                            className={cn("w-full min-w-0 text-left rounded border-l-2 px-1 overflow-hidden text-[9px] leading-tight hover:brightness-95 transition-all flex flex-col justify-center", cfg.cardClass, cfg.borderClass)}
                          >
                            <span className={cn("font-black block truncate", cfg.timeClass)}>{format(parseFirestoreDate(apt.startTime), 'HH:mm')}</span>
                            <span className="font-semibold block truncate">{apt.customerName}</span>
                            {serviceName && <span className="text-muted-foreground block truncate text-[8px]">{serviceName}</span>}
                          </button>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AppointmentDetailDialog
        apt={selectedApt}
        tenantId={tenantId}
        onUpdate={onUpdate}
        onReschedule={onReschedule}
        onClose={() => setSelectedApt(null)}
        getBookedSlotsForDate={getBookedSlotsForDate}
      />
    </div>
  );
}

// ─── VISTA MENSUAL ────────────────────────────────────────────────────────────
function MonthView({ agenda, onNewAppointment, onDayClick }: {
  agenda: PopulatedAppointment[];
  onNewAppointment: (date: Date) => void;
  onDayClick: (date: Date) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  const currentMonth = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return d;
  }, [monthOffset]);

  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);

  // Obtiene el día de la semana del 1ro del mes (0=Dom → convertir a lunes=0)
  const firstDayOfWeek = useMemo(() => {
    const d = getDay(startOfMonth(currentMonth));
    return d === 0 ? 6 : d - 1; // lunes = 0
  }, [currentMonth]);

  const aptsPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    agenda.forEach(a => {
      if (a.status === 'cancelled') return;
      const d = parseFirestoreDate(a.startTime);
      if (isSameMonth(d, currentMonth)) {
        const key = format(d, 'yyyy-MM-dd');
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [agenda, currentMonth]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-bold text-sm capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o + 1)}><ChevronRight className="w-4 h-4" /></Button>
      </div>

      <div className="rounded-xl border overflow-hidden">
        {/* Header días de la semana */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Grilla de días */}
        <div className="grid grid-cols-7">
          {/* Celdas vacías antes del primer día */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r last:border-r-0 bg-muted/10 min-h-[72px]" />
          ))}

          {days.map((day, i) => {
            const key = format(day, 'yyyy-MM-dd');
            const count = aptsPerDay[key] || 0;
            const isT = isToday(day);
            const col = (firstDayOfWeek + i) % 7;
            const isLastCol = col === 6;

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[72px] border-b p-1.5 flex flex-col relative group cursor-pointer transition-colors",
                  !isLastCol && "border-r",
                  isT ? "bg-primary/5" : "hover:bg-muted/30"
                )}
                onClick={() => {
                  if (count > 0) {
                    onDayClick(day);
                  } else {
                    onNewAppointment(day);
                  }
                }}
              >
                {/* Número del día */}
                <button
                  className={cn(
                    "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mb-1 transition-colors",
                    isT
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted group-hover:bg-muted"
                  )}
                  onClick={e => { e.stopPropagation(); onDayClick(day); }}
                >
                  {format(day, 'd')}
                </button>

                {/* Indicador de turnos */}
                {count > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary text-[10px] font-black rounded-md px-1.5 py-0.5 leading-none">
                      {count}
                    </span>
                    <span className="text-[9px] text-muted-foreground hidden sm:block">{count === 1 ? 'turno' : 'turnos'}</span>
                  </div>
                )}

                {/* Hint de agregar (hover en días vacíos) */}
                {count === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export function ProfessionalAgenda({ tenantId }: ProfessionalAgendaProps) {
  const { appointments, updateAppointmentStatus, rescheduleAppointment, getBookedSlotsForDate, appointmentsThisMonth, loading: aLoading } = useAppointments(tenantId);
  const { services, loading: sLoading } = useServices(tenantId);
  const { professionals, loading: pLoading } = useProfessionals(tenantId);
  const { salon } = useSalon(tenantId);
  const { features } = usePlan(tenantId);
  const { branches } = useBranches(tenantId);
  const [view, setView] = useState<'list' | 'grid' | 'month'>('list');
  const [localOverrides, setLocalOverrides] = useState<Record<string, AppStatus>>({});
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | undefined>(undefined);
  const [weekOffsetForDay, setWeekOffsetForDay] = useState(0);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [agendaKind, setAgendaKind] = useState<'turnos' | 'clases'>('turnos');
  const loading = aLoading || sLoading || pLoading;

  // Combina datos de Firestore con overrides locales para UI instantánea
  const agenda = (appointments || [])
    .filter(apt => selectedBranchId === 'all' || (apt as any).branchId === selectedBranchId)
    .map(apt => ({
      ...apt,
      status: localOverrides[apt.id] || apt.status,
      services: (apt.serviceIds || []).map(id => (services || []).find(s => s.id === id)).filter(Boolean) as Service[],
      professional: (professionals || []).find(p => p.id === apt.professionalId),
    }))
    .sort((a, b) => parseFirestoreDate(a.startTime).getTime() - parseFirestoreDate(b.startTime).getTime()) as PopulatedAppointment[];

  const isClassAppointment = (apt: PopulatedAppointment) =>
    apt.services.length === 1 && (apt.services[0] as any).type === 'clase';

  const hasAnyClass = (services || []).some(s => (s as any).type === 'clase');
  const filteredAgenda = features.hasClasses && hasAnyClass
    ? agenda.filter(a => agendaKind === 'clases' ? isClassAppointment(a) : !isClassAppointment(a))
    : agenda;

  const handleUpdate = (id: string, status: AppStatus) => {
    setLocalOverrides(prev => ({ ...prev, [id]: status }));
    if (updateAppointmentStatus) updateAppointmentStatus(id, status);

    // Si el dueño cancela, notificar al cliente automáticamente
    if (status === 'cancelled') {
      const apt = agenda.find(a => a.id === id);
      if (apt?.customerPhone) {
        const dateObj = parseFirestoreDate(apt.startTime);
        const formattedDate = format(dateObj, "eeee dd 'de' MMMM 'a las' HH:mm'hs'", { locale: es });
        const bookLink = `${window.location.origin}/book/${tenantId}`;
        const message = isClassAppointment(apt)
          ? `❌ *Cupo cancelado*\n\nHola ${apt.customerName}, lamentablemente tu cupo en *${apt.services[0].name}* del ${formattedDate} fue cancelado.\n\nPodés reservar otro horario cuando quieras acá:\n${bookLink}\n\n¡Disculpá las molestias!`
          : `❌ *Turno Cancelado*\n\nHola ${apt.customerName}, lamentablemente tu turno del ${formattedDate} fue cancelado.\n\n📋 ${apt.services.map((s: any) => s?.name).join(', ')}\n\nPodés sacar un nuevo turno cuando quieras acá:\n${bookLink}\n\n¡Disculpá las molestias!`;
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

  const upcomingCount = filteredAgenda.filter(a => a.status === 'confirmed' && parseFirestoreDate(a.startTime) > new Date()).length;
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

      {/* Selector Turnos / Clases */}
      {features.hasClasses && hasAnyClass && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Ver:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setAgendaKind('turnos')}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-bold transition-all", agendaKind === 'turnos' ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted")}
            >
              Turnos
            </button>
            <button
              onClick={() => setAgendaKind('clases')}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-bold transition-all", agendaKind === 'clases' ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted")}
            >
              Clases
            </button>
          </div>
        </div>
      )}

      {/* Selector de sucursal */}
      {branches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sucursal:</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedBranchId('all')}
              className={cn("text-xs px-3 py-1.5 rounded-full border font-bold transition-all", selectedBranchId === 'all' ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted")}
            >
              Todas
            </button>
            {branches.map(branch => (
              <button
                key={branch.id}
                onClick={() => setSelectedBranchId(branch.id)}
                className={cn("text-xs px-3 py-1.5 rounded-full border font-bold transition-all", selectedBranchId === branch.id ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted")}
              >
                {branch.name}
              </button>
            ))}
          </div>
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
              <Button size="sm" variant={view === 'month' ? 'default' : 'ghost'} className="rounded-lg h-8 px-2.5" onClick={() => setView('month')}>
                <CalendarDays className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Mes</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {view === 'list' && <ListView agenda={filteredAgenda} onUpdate={handleUpdate} onReschedule={(id, s, e) => rescheduleAppointment && rescheduleAppointment(id, s, e)} tenantId={tenantId} getBookedSlotsForDate={getBookedSlotsForDate} />}
      {view === 'grid' && (
        <GridView
          agenda={filteredAgenda}
          onUpdate={handleUpdate}
          onReschedule={(id, newStart, newEnd) => rescheduleAppointment && rescheduleAppointment(id, newStart, newEnd)}
          tenantId={tenantId}
          initialWeekOffset={weekOffsetForDay}
          getBookedSlotsForDate={getBookedSlotsForDate}
        />
      )}
      {view === 'month' && (
        <MonthView
          agenda={filteredAgenda}
          onNewAppointment={(date) => {
            setNewAppointmentDate(date);
            setShowNewAppointment(true);
          }}
          onDayClick={(date) => {
            const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
            const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
            const diffMs = targetWeekStart.getTime() - todayWeekStart.getTime();
            const offset = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
            setWeekOffsetForDay(offset);
            setView('grid');
          }}
        />
      )}

      <NewAppointmentModal
        open={showNewAppointment}
        onClose={() => { setShowNewAppointment(false); setNewAppointmentDate(undefined); }}
        tenantId={tenantId}
        services={services || []}
        professionals={professionals || []}
        blockedSlots={(salon as any)?.blockedSlots || []}
        defaultDate={newAppointmentDate}
      />
    </div>
  );
}
