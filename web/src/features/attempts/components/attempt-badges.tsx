import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/features/test/types';
import { OUTCOME_LABELS } from '@/features/attempts/lib/attempt-labels';

const OUTCOME_CLASSES: Record<RiskLevel, string> = {
  low: 'border-[#a6a867]/45 bg-[#a6a867]/18 text-[#51513d]',
  medium: 'border-[#e3dc95] bg-[#e3dc95]/32 text-[#51513d]',
  high: 'border-[#9e5a5a]/35 bg-[#9e5a5a]/10 text-[#7d3d3d]',
};

export function OutcomeBadge({ outcome }: { outcome: RiskLevel }) {
  return (
    <Badge
      variant="outline"
      className={cn('rounded-md border px-2 py-0.5 font-black', OUTCOME_CLASSES[outcome])}
    >
      {OUTCOME_LABELS[outcome]}
    </Badge>
  );
}
