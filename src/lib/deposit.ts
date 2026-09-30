// Configuración y cálculo de la seña. Se usa igual en el navegador (para mostrar
// el monto antes de reservar) y en el servidor (que es el que cobra de verdad).

export type DepositType = 'fixed' | 'percent';

export interface DepositConfig {
  enabled: boolean;
  type: DepositType;
  value: number;
  expiryMinutes: number;
}

export const DEFAULT_DEPOSIT: DepositConfig = {
  enabled: false,
  type: 'percent',
  value: 30,
  expiryMinutes: 15,
};

export function getDepositConfig(salon: any): DepositConfig {
  return { ...DEFAULT_DEPOSIT, ...(salon?.deposit || {}) };
}

/** La seña se pide solo si el negocio la activó y tiene Mercado Pago conectado. */
export function isDepositActive(salon: any): boolean {
  return !!salon?.mpConnected && getDepositConfig(salon).enabled === true;
}

/** Monto de la seña en pesos enteros. Nunca supera el total del turno. */
export function computeDepositAmount(config: DepositConfig, total: number): number {
  const safeTotal = Math.max(0, Number(total) || 0);
  const value = Math.max(0, Number(config.value) || 0);
  const amount = config.type === 'fixed' ? value : (safeTotal * value) / 100;
  const capped = safeTotal > 0 ? Math.min(amount, safeTotal) : amount;
  return Math.round(capped);
}
