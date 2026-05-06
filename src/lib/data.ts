export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  type?: 'whatsapp' | 'combo' | 'oferta';
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  avatarHint: string;
  emoji?: string; // emoji en lugar de foto
}

export interface Appointment {
  id: string;
  salonId: string;
  professionalId: string;
  serviceIds: string[];
  startTime: any;
  endTime: any;
  total: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'blocked';
  customerId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod?: string;
  createdAt?: any;
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
