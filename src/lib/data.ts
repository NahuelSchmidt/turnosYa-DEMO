
import { PlaceHolderImages } from "./placeholder-images";
import { addHours, addDays, startOfHour, set } from 'date-fns';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  type?: 'whatsapp';
}

export interface Professional {
  id: string;
  name:string;
  specialty: string;
  avatarUrl: string;
  avatarHint: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  professionalId: string;
  serviceIds: string[];
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'cancelled' | 'completed' | 'blocked';
  total: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
}

export const initialServices: Service[] = [
  { id: 'ser1', name: 'Corte de Pelo', description: 'Corte moderno y con estilo.', price: 1500, duration: 30 },
  { id: 'ser2', name: 'Afeitado Clásico', description: 'Afeitado a navaja con toallas calientes.', price: 1200, duration: 45 },
  { id: 'ser3', name: 'Corte y Barba', description: 'Combo completo para un look impecable.', price: 2500, duration: 60 },
  { id: 'ser4', name: 'Cotizar Tintura por WhatsApp', description: 'Precios y tiempos varían. Contáctanos.', price: 0, duration: 0, type: 'whatsapp' },
];

export const initialProfessionals: Professional[] = [
  { id: 'prof1', name: 'Carlos "El Mago" Pérez', specialty: 'Estilista Senior', avatarUrl: 'https://picsum.photos/seed/prof1/200/200', avatarHint: 'man portrait' },
  { id: 'prof2', name: 'Sofía "La Artista" Gómez', specialty: 'Colorista', avatarUrl: 'https://picsum.photos/seed/prof2/200/200', avatarHint: 'woman portrait' },
];

const today = new Date();
export const initialAppointments: Appointment[] = [
    {
        id: 'apt1',
        customerId: 'cus1',
        professionalId: 'prof1',
        serviceIds: ['ser1', 'ser2'],
        startTime: set(addDays(today, 2), { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 }),
        endTime: set(addDays(today, 2), { hours: 11, minutes: 15, seconds: 0, milliseconds: 0 }),
        status: 'confirmed',
        total: 2700,
        customerName: "Juan Cliente",
        customerPhone: "+5491122334455",
        paymentMethod: "Mercado Pago"
    },
    {
        id: 'apt2',
        customerId: 'cus1',
        professionalId: 'prof2',
        serviceIds: ['ser3'],
        startTime: set(addDays(today, -5), { hours: 15, minutes: 0, seconds: 0, milliseconds: 0 }),
        endTime: set(addDays(today, -5), { hours: 16, minutes: 0, seconds: 0, milliseconds: 0 }),
        status: 'completed',
        total: 2500,
        customerName: "Juan Cliente",
        customerPhone: "+5491122334455",
        paymentMethod: "Efectivo"
    }
];

export const initialTimeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];
