export type PlanType = 'basic' | 'pro' | 'premium';

export const PLAN_FEATURES = {
  basic: {
    label: 'Basic',
    maxProfessionals: 1,
    maxAppointmentsPerMonth: 50,
    hasMetrics: false,
    hasBlockedDates: false,
    hasCombosAndOffers: false,
    hasWeeklyView: false,
    hasBrandColor: false,
    hasAdminBooking: false,
    hasProfilePage: false,
    hasClasses: false,
    hasWhatsAppAutomation: false,
    hasDeposits: false,
  },
  pro: {
    label: 'Pro',
    maxProfessionals: 3,
    maxAppointmentsPerMonth: 999999,
    hasMetrics: true,
    hasBlockedDates: true,
    hasCombosAndOffers: true,
    hasWeeklyView: true,
    hasBrandColor: true,
    hasAdminBooking: true,
    hasProfilePage: true,
    hasClasses: true,
    hasWhatsAppAutomation: true,
    hasDeposits: true,
  },
  premium: {
    label: 'Premium',
    maxProfessionals: 999999,
    maxAppointmentsPerMonth: 999999,
    hasMetrics: true,
    hasBlockedDates: true,
    hasCombosAndOffers: true,
    hasWeeklyView: true,
    hasBrandColor: true,
    hasAdminBooking: true,
    hasProfilePage: true,
    hasClasses: true,
    hasWhatsAppAutomation: true,
    hasDeposits: true,
  },
} as const;

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  type?: 'whatsapp' | 'combo' | 'oferta' | 'clase';
  professionalIds?: string[];
  durationByProfessional?: Record<string, number>; // minutos con un profesional en particular, si tarda distinto
  category?: string; // agrupa variantes en la reserva (ej: "Baño y corte" → por peso del perro)
  capacity?: number; // cupo máximo de clientes por horario, solo para type: 'clase'
  address?: string; // ubicación propia, solo para type: 'clase' — si no está, se usa la del negocio
}

/** Duración del servicio con un profesional (si tiene una propia) o la general. */
export function serviceDuration(service: Service, professionalId?: string | null): number {
  const own = professionalId ? service.durationByProfessional?.[professionalId] : undefined;
  return own && own > 0 ? own : service.duration;
}

/** Texto de la duración: "60min", o "60–90min" si depende del profesional. */
export function durationLabel(service: Service): string {
  const all = [service.duration, ...Object.values(service.durationByProfessional || {}).filter(d => d > 0)];
  const min = Math.min(...all), max = Math.max(...all);
  return min === max ? `${min}min` : `${min}–${max}min`;
}

/** Nombre de la opción dentro de su categoría: "Baño y corte · hasta 10 kg" → "hasta 10 kg". */
export function optionLabel(service: Service): string {
  const cat = service.category?.trim();
  if (!cat) return service.name;
  const rest = service.name.trim();
  if (rest.toLowerCase().startsWith(cat.toLowerCase())) {
    const stripped = rest.slice(cat.length).replace(/^\s*[·\-–—:|,]\s*/, '').trim();
    if (stripped) return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }
  return rest;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  avatarHint: string;
  emoji?: string;
  weekSchedule?: Record<string, { enabled: boolean; slots: string[] }>; // horario propio (opcional)
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  weekSchedule?: Record<string, { enabled: boolean; slots: string[] }>;
  blockedDates?: string[];
  blockedSlots?: { date: string; time: string }[];
  professionalIds?: string[];
}

export interface BlockedSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface Appointment {
  id: string;
  salonId: string;
  professionalId: string;
  serviceIds: string[];
  startTime: any;
  endTime: any;
  total: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'blocked' | 'pending_payment' | 'expired';
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  createdAt?: any;
  reminderSent24h?: boolean;
  reminderSentSameDay?: boolean;
  reviewSent?: boolean;
  branchId?: string;
  // Seña con Mercado Pago
  paymentExpiresAt?: any;
  depositStatus?: 'pending' | 'paid' | 'none';
  depositMethod?: 'mercadopago' | 'transfer';
  depositAmount?: number;
  depositPaidAmount?: number;
  depositNeedsRefund?: boolean;
}

export const initialServices: Service[] = [
  { id: 'ser1', name: 'Corte de Pelo', description: 'Corte moderno y con estilo.', price: 1500, duration: 30 },
  { id: 'ser2', name: 'Afeitado Clásico', description: 'Afeitado a navaja con toallas calientes.', price: 1200, duration: 45 },
  { id: 'ser3', name: 'Corte y Barba', description: 'Combo completo para un look impecable.', price: 2500, duration: 60, type: 'combo' },
  { id: 'ser5', name: 'Lunes de descuento', description: '20% off en todos los servicios los lunes.', price: 1200, duration: 30, type: 'oferta' },
  { id: 'ser4', name: 'Cotizar Tintura por WhatsApp', description: 'Precios y tiempos varían. Contáctanos.', price: 0, duration: 0, type: 'whatsapp' },
];

export const initialProfessionals: Professional[] = [
  { id: 'prof1', name: 'Carlos Mendoza', specialty: 'Barbero Senior', avatarUrl: 'https://picsum.photos/seed/carlos/200/200', avatarHint: 'man portrait', emoji: '✂️' },
  { id: 'prof2', name: 'Ana García', specialty: 'Estilista', avatarUrl: 'https://picsum.photos/seed/ana/200/200', avatarHint: 'woman portrait', emoji: '💇' },
];

export const initialTimeSlots: string[] = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00',
];
