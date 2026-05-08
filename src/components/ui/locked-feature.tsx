import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LockedFeatureProps {
  featureName: string;
  requiredPlan: 'pro' | 'premium';
}

const PLAN_LABELS = { pro: 'Pro', premium: 'Premium' };

export function LockedFeature({ featureName, requiredPlan }: LockedFeatureProps) {
  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{featureName}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Disponible en Plan{' '}
            <span className="font-bold text-foreground">{PLAN_LABELS[requiredPlan]}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
