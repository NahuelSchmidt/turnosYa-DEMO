'use client';

import { useSalon } from '@/hooks/use-salon';
import { PlanType, PLAN_FEATURES } from '@/lib/data';

export function usePlan(tenantId: string) {
  const { salon } = useSalon(tenantId);
  const plan = (salon?.plan as PlanType) || 'basic';
  const features = PLAN_FEATURES[plan];
  return { plan, features };
}
