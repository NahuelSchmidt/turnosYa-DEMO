"use client";

import { useMemo, useState } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Service } from '@/lib/data';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User } from 'lucide-react';
import { parseFirestoreDate, cn } from '@/lib/utils';
import { AppStatus, STATUS_CONFIG, PopulatedAppointment } from './ProfessionalAgenda';

interface AppointmentHistoryProps { tenantId: string; }

const HISTORY_STATUSES: AppStatus[] = ['completed', 'cancelled', 'no-show'];
const STATUS_FILTERS = ['completed', 'cancelled', 'no-show', 'all'] as const;

function getMonthOptions() {
  const options: { value: string; label: string }[] = [{ value: 'all', label: 'Todo el tiempo' }];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    options.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
    });
  }
  return options;
}

export function AppointmentHistory({ tenantId }: AppointmentHistoryProps) {
  const { appointments, loading: aLoading } = useAppointments(tenantId);
  const { services, loading: sLoading } = useServices(tenantId);
  const { professionals, loading: pLoading } = useProfessionals(tenantId);
  const loading = aLoading || sLoading || pLoading;

  const [statusFilter, setStatusFilter] = useState<AppStatus | 'all'>('completed');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const history = useMemo(() => {
    return (appointments || [])
      .filter(apt => HISTORY_STATUSES.includes(apt.status as AppStatus))
      .map(apt => ({
        ...apt,
        services: (apt.serviceIds || []).map(id => (services || []).find(s => s.id === id)).filter(Boolean) as Service[],
        professional: (professionals || []).find(p => p.id === apt.professionalId),
      }))
      .sort((a, b) => parseFirestoreDate(b.startTime).getTime() - parseFirestoreDate(a.startTime).getTime()) as PopulatedAppointment[];
  }, [appointments, services, professionals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter(apt => {
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
      if (period !== 'all' && format(parseFirestoreDate(apt.startTime), 'yyyy-MM') !== period) return false;
      if (q && !apt.customerName?.toLowerCase().includes(q) && !apt.customerPhone?.includes(q)) return false;
      return true;
    });
  }, [history, statusFilter, period, search]);

  const totalRevenue = useMemo(
    () => filtered.filter(a => a.status === 'completed').reduce((s, a) => s + (a.total || 0), 0),
    [filtered]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando historial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(key => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border font-bold transition-all",
                statusFilter === key ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 hover:bg-muted"
              )}
            >
              {key === 'all' ? 'Todos' : STATUS_CONFIG[key].label}
            </button>
          ))}
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary sm:ml-auto"
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o teléfono..."
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><span className="font-bold text-foreground">{filtered.length}</span> {filtered.length === 1 ? 'turno' : 'turnos'}</span>
        {statusFilter !== 'cancelled' && statusFilter !== 'no-show' && (
          <span><span className="font-bold text-foreground">${totalRevenue.toLocaleString('es-AR')}</span> facturados</span>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(apt => {
            const status = (apt.status as AppStatus) || 'completed';
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            const dateObj = parseFirestoreDate(apt.startTime);
            return (
              <div
                key={apt.id}
                className={cn(
                  "rounded-xl border border-l-4 p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4",
                  cfg.cardClass, cfg.borderClass
                )}
              >
                <div className="shrink-0 text-center w-20">
                  <p className={cn("text-sm font-black tabular-nums leading-none", cfg.timeClass)}>
                    {format(dateObj, 'dd/MM/yy')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{format(dateObj, 'HH:mm')}hs</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{apt.customerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{apt.services.map(s => s.name).join(', ') || '—'}</p>
                  {apt.professional && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> {apt.professional.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {apt.status === 'completed' && (
                    <span className="text-sm font-bold">${(apt.total || 0).toLocaleString('es-AR')}</span>
                  )}
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold", cfg.badgeClass)}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm py-8 border rounded-xl text-center">No hay turnos que coincidan con estos filtros.</p>
      )}
    </div>
  );
}
