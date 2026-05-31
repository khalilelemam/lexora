import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/features/test/types';
import { OUTCOME_LABELS } from '@/features/attempts/lib/attempt-labels';

const OUTCOME_CLASSES: Record<RiskLevel, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-red-200 bg-red-50 text-red-700',
};

export function OutcomeBadge({ outcome }: { outcome: RiskLevel }) {
  return (
    <Badge variant="outline" className={cn('border', OUTCOME_CLASSES[outcome])}>
      {OUTCOME_LABELS[outcome]}
    </Badge>
  );
}
