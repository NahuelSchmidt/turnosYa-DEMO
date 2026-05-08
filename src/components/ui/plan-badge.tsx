import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PlanType } from '@/lib/data';

const PLAN_CLASSES: Record<PlanType, string> = {
  basic: 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-900/20',
  pro: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/20',
  premium: 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20',
};

const PLAN_LABELS: Record<PlanType, string> = {
  basic: 'Basic',
  pro: 'Pro',
  premium: 'Premium ⭐',
};

interface PlanBadgeProps {
  plan: PlanType;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  return (
    <Badge variant="outline" className={cn(PLAN_CLASSES[plan], 'font-bold text-xs', className)}>
      {PLAN_LABELS[plan]}
    </Badge>
  );
}
