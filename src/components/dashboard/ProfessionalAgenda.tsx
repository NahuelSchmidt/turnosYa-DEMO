
"use client";

import { useState, useEffect } from 'react';
import { useAppointments } from '@/hooks/use-appointments';
import { useServices } from '@/hooks/use-services';
import { useProfessionals } from '@/hooks/use-professionals';
import { Appointment, Service, Professional } from '@/lib/data';
import { format, isToday, isThisWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, User, Clock, Ban } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

interface PopulatedAppointment extends Omit<Appointment, 'serviceIds' | 'professionalId'> {
  services: Service[];
  professional: Professional | undefined;
}

interface ProfessionalAgendaProps {
    tenantId: string;
}

export function ProfessionalAgenda({ tenantId }: ProfessionalAgendaProps) {
  const { appointments, cancelAppointment, loading: appointmentsLoading } = useAppointments(tenantId);
  const { services, loading: servicesLoading } = useServices(tenantId);
  const { professionals, loading: professionalsLoading } = useProfessionals(tenantId);
  
  const [agenda, setAgenda] = useState<PopulatedAppointment[]>([]);
  const loading = appointmentsLoading || servicesLoading || professionalsLoading;

  useEffect(() => {
    if (!loading) {
      const appointmentsList = appointments || [];
      const servicesList = services || [];
      const professionalsList = professionals || [];

      const populated = appointmentsList
        .map(apt => ({
          ...apt,
          services: (apt.serviceIds || []).map(id => servicesList.find(s => s.id === id)).filter(Boolean) as Service[],
          professional: professionalsList.find(p => p.id === apt.professionalId)
        }))
        .sort((a, b) => parseFirestoreDate(a.startTime).getTime() - parseFirestoreDate(b.startTime).getTime());
      setAgenda(populated);
    }
  }, [appointments, services, professionals, loading]);

  const handleBlock = (appointmentId: string) => {
      cancelAppointment(appointmentId);
  }

  const todayAppointments = agenda.filter(apt => apt.status === 'confirmed' && isToday(parseFirestoreDate(apt.startTime)));
  const thisWeekAppointments = agenda.filter(apt => apt.status === 'confirmed' && !isToday(parseFirestoreDate(apt.startTime)) && isThisWeek(parseFirestoreDate(apt.startTime), { weekStartsOn: 1 }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Turnos de Hoy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayAppointments.length > 0 ? (
            todayAppointments.map(apt => {
              const dateObj = parseFirestoreDate(apt.startTime);
              return (
                <Card key={apt.id} className="p-4">
                  <div className="flex justify-between items-start">
                      <div className="space-y-1">
                          <p className="font-bold text-lg">{format(dateObj, 'HH:mm')}hs - {apt.customerName}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="w-4 h-4"/>{apt.professional?.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/>{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm"><Ban className="mr-2 h-4 w-4"/>No disponible</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>¿Marcar como no disponible?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Esta acción cancelará el turno y el horario dejará de estar disponible. Se notificará al cliente.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Volver</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleBlock(apt.id)}>Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                  </div>
                </Card>
              );
            })
          ) : (
            <p className="text-muted-foreground">No hay turnos agendados para hoy.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Próximos en la Semana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {thisWeekAppointments.length > 0 ? (
            thisWeekAppointments.map(apt => {
                const dateObj = parseFirestoreDate(apt.startTime);
                return (
                  <Card key={apt.id} className="p-4">
                      <div className="flex justify-between items-start">
                          <div className="space-y-1">
                              <p className="font-bold text-lg capitalize">{format(dateObj, "eeee dd, HH:mm'hs'", {locale: es})}</p>
                              <p className="text-sm text-muted-foreground">{apt.customerName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2"><User className="w-4 h-4"/>{apt.professional?.name}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/>{apt.services.map(s => s.name).join(', ')}</p>
                          </div>
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm"><Ban className="mr-2 h-4 w-4"/>No disponible</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>¿Marcar como no disponible?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Esta acción cancelará el turno y el horario dejará de estar disponible. Se notificará al cliente.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Volver</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleBlock(apt.id)}>Confirmar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                          </AlertDialog>
                      </div>
                </Card>
              );
            })
          ) : (
            <p className="text-muted-foreground">No hay más turnos agendados para esta semana.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
