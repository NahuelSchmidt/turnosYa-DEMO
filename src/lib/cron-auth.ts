import { NextRequest } from 'next/server';

/**
 * Solo el cron (cron-job.org) puede llamar a las tareas programadas. La clave va en
 * REMINDER_CRON_SECRET (o CRON_SECRET) y se manda como `Authorization: Bearer <clave>`,
 * el header `x-cron-secret` o `?secret=`. Sin clave configurada, en producción no se ejecuta.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secrets = [process.env.REMINDER_CRON_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (!secrets.length) {
    if (process.env.NODE_ENV === 'production') console.error('[Cron] Falta REMINDER_CRON_SECRET: no se ejecuta');
    return process.env.NODE_ENV !== 'production';
  }
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const given = bearer || req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  return !!given && secrets.includes(given);
}
