// Configuración y cálculo de la seña. Se usa igual en el navegador (para mostrar
// el monto antes de reservar) y en el servidor (que es el que cobra de verdad).

export type DepositType = 'fixed' | 'percent';
/** mercadopago: se paga y confirma solo. transfer: el cliente transfiere y el dueño confirma. */
export type DepositMethod = 'mercadopago' | 'transfer';

export interface DepositConfig {
  enabled: boolean;
  method: DepositMethod;
  type: DepositType;
  value: number;
  expiryMinutes: number;
}

export const DEFAULT_DEPOSIT: DepositConfig = {
  enabled: false,
  method: 'mercadopago',
  type: 'percent',
  value: 30,
  expiryMinutes: 15,
};

/** Opciones de tiempo para pagar: la transferencia depende de que el dueño la vea, necesita más. */
export const EXPIRY_OPTIONS: Record<DepositMethod, number[]> = {
  mercadopago: [10, 15, 30, 60],
  transfer: [60, 120, 360, 720, 1440],
};

export function formatExpiry(minutes: number): string {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = minutes / 60;
  return hours === 1 ? '1 hora' : `${hours} horas`;
}

export function getDepositConfig(salon: any): DepositConfig {
  return { ...DEFAULT_DEPOSIT, ...(salon?.deposit || {}) };
}

/**
 * La seña se pide solo si el negocio la activó y puede cobrarla:
 * Mercado Pago conectado, o un alias cargado para recibir la transferencia.
 */
export function isDepositActive(salon: any): boolean {
  const config = getDepositConfig(salon);
  if (!config.enabled) return false;
  if (config.method === 'transfer') return !!salon?.paymentAlias;
  return !!salon?.mpConnected;
}

/** Monto de la seña en pesos enteros. Nunca supera el total del turno. */
export function computeDepositAmount(config: DepositConfig, total: number): number {
  const safeTotal = Math.max(0, Number(total) || 0);
  const value = Math.max(0, Number(config.value) || 0);
  const amount = config.type === 'fixed' ? value : (safeTotal * value) / 100;
  const capped = safeTotal > 0 ? Math.min(amount, safeTotal) : amount;
  return Math.round(capped);
}
