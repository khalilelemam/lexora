'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeValue {
  from?: string;
  to?: string;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(parseDateKey(value.from) ?? parseDateKey(value.to) ?? new Date()),
  );
  const selectedRange = useMemo(
    () => ({
      from: parseDateKey(value.from),
      to: parseDateKey(value.to),
    }),
    [value.from, value.to],
  );
  const nextMonth = useMemo(() => addMonths(visibleMonth, 1), [visibleMonth]);

  const handleSelectDate = (date: Date) => {
    const selectedKey = formatDateKey(date);

    if (!selectedRange.from || selectedRange.to) {
      onChange({ from: selectedKey, to: undefined });
      return;
    }

    if (isBeforeDate(date, selectedRange.from)) {
      onChange({ from: selectedKey, to: formatDateKey(selectedRange.from) });
      setOpen(false);
      return;
    }

    onChange({ from: formatDateKey(selectedRange.from), to: selectedKey });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start border-[#51513d]/22 bg-[#e3dcc2]/75 px-3 text-[#1b2021] hover:bg-[#e3dc95]/45"
        >
          <CalendarDays className="h-4 w-4 opacity-70" />
          <span className={cn('truncate', !value.from && !value.to && 'text-[#1b2021]/46')}>
            {formatRangeLabel(value)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto border-[#51513d]/22 bg-[#f3edd7] p-0 text-[#1b2021] shadow-[10px_10px_0_rgba(81,81,61,.1)]"
        sideOffset={8}
      >
        <div className="border-b border-[#51513d]/16 p-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#51513d] hover:bg-[#51513d]/10 hover:text-[#1b2021]"
              onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {formatMonthYear(visibleMonth)} - {formatMonthYear(nextMonth)}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-[#51513d] hover:bg-[#51513d]/10 hover:text-[#1b2021]"
              onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-3 md:grid-cols-2">
          <MonthCalendar
            month={visibleMonth}
            range={selectedRange}
            onSelectDate={handleSelectDate}
          />
          <MonthCalendar month={nextMonth} range={selectedRange} onSelectDate={handleSelectDate} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#51513d]/16 p-3">
          <div className="flex flex-wrap gap-2">
            <QuickRangeButton days={7} onChange={onChange} onClose={() => setOpen(false)} />
            <QuickRangeButton days={30} onChange={onChange} onClose={() => setOpen(false)} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!value.from && !value.to}
            className="font-bold text-[#51513d] hover:bg-[#51513d]/10 hover:text-[#1b2021]"
            onClick={() => {
              onChange({ from: undefined, to: undefined });
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
            Clear dates
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MonthCalendar({
  month,
  range,
  onSelectDate,
}: {
  month: Date;
  range: { from: Date | null; to: Date | null };
  onSelectDate: (date: Date) => void;
}) {
  const days = useMemo(() => getCalendarDays(month), [month]);

  return (
    <div className="w-70">
      <div className="mb-3 text-center text-sm font-medium">{formatMonthYear(month)}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#51513d]/64">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="flex h-7 items-center justify-center">
            {weekday}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = day.getUTCMonth() === month.getUTCMonth();
          const isSelectedBoundary = isSameDate(day, range.from) || isSameDate(day, range.to);
          const isInRange = isDateInRange(day, range.from, range.to);

          return (
            <button
              key={formatDateKey(day)}
              type="button"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors outline-none hover:bg-[#e3dc95]/55 focus-visible:ring-2 focus-visible:ring-[#51513d]/40',
                !isCurrentMonth && 'text-[#1b2021]/35',
                isInRange && 'bg-[#a6a867]/22 text-[#1b2021]',
                isSelectedBoundary && 'bg-[#51513d] text-[#e3dcc2] hover:bg-[#1b2021]',
              )}
              onClick={() => onSelectDate(day)}
              aria-pressed={isSelectedBoundary}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickRangeButton({
  days,
  onChange,
  onClose,
}: {
  days: number;
  onChange: (value: DateRangeValue) => void;
  onClose: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-[#51513d]/22 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/45"
      onClick={() => {
        const today = localDateAsUtcMidnight();
        onChange({
          from: formatDateKey(addDays(today, -(days - 1))),
          to: formatDateKey(today),
        });
        onClose();
      }}
    >
      Last {days} days
    </Button>
  );
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const gridStart = addDays(firstDay, -firstDay.getUTCDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function parseDateKey(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatRangeLabel(value: DateRangeValue) {
  const from = parseDateKey(value.from);
  const to = parseDateKey(value.to);

  if (from && to) {
    return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  }

  if (from) {
    return `${formatDateLabel(from)} - select end`;
  }

  if (to) {
    return `Until ${formatDateLabel(to)}`;
  }

  return 'Select date range';
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

/**
 * Returns the user's local "today" as a UTC midnight Date.
 *
 * Local-time getters are intentional — using UTC getters would give
 * "yesterday" for users in positive UTC offsets after local midnight
 * (e.g., UTC+5 at 2am local → UTC 9pm previous day).
 */
function localDateAsUtcMidnight() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function isBeforeDate(date: Date, comparison: Date) {
  return formatDateKey(date) < formatDateKey(comparison);
}

function isSameDate(date: Date, comparison: Date | null) {
  return comparison ? formatDateKey(date) === formatDateKey(comparison) : false;
}

function isDateInRange(date: Date, from: Date | null, to: Date | null) {
  if (!from || !to) {
    return false;
  }

  const key = formatDateKey(date);
  return key > formatDateKey(from) && key < formatDateKey(to);
}
