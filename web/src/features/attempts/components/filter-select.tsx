'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterSelectProps<T extends string> {
  label: string;
  value: string;
  allLabel?: string;
  allValue: string;
  options: Record<T, string>;
  onChange: (value: string) => void;
}

export function FilterSelect<T extends string>({
  label,
  value,
  allLabel = 'All',
  allValue,
  options,
  onChange,
}: FilterSelectProps<T>) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full border-[#51513d]/22 bg-[#e3dcc2]/75 text-[#1b2021] focus:ring-[#51513d]/35">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="border-[#51513d]/22 bg-[#f3edd7] text-[#1b2021]">
          <SelectItem value={allValue}>{allLabel}</SelectItem>
          {Object.entries(options).map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel as string}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
