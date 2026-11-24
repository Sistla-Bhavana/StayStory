import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange } from '../types.ts';
import { getTodayIso, isDateBlocked, rangeHasConflict, toIsoDate } from '../lib/dates.ts';

interface AvailabilityCalendarProps {
  bookedRanges: DateRange[];
  checkIn: string;
  checkOut: string;
  onSelectRange: (checkIn: string, checkOut: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function AvailabilityCalendar({
  bookedRanges,
  checkIn,
  checkOut,
  onSelectRange,
}: AvailabilityCalendarProps) {
  const todayIso = getTodayIso();
  const initialDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const [monthOffset, setMonthOffset] = useState(0);

  const visibleMonths = useMemo(() => {
    return [0, 1].map((delta) => {
      const firstOfMonth = new Date(
        initialDate.getFullYear(),
        initialDate.getMonth() + monthOffset + delta,
        1
      );
      const year = firstOfMonth.getFullYear();
      const month = firstOfMonth.getMonth();
      const label = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }).format(firstOfMonth);

      const startWeekday = firstOfMonth.getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const cells: Array<{ iso: string; day: number } | null> = [];

      for (let i = 0; i < startWeekday; i += 1) {
        cells.push(null);
      }
      for (let d = 1; d <= daysInMonth; d += 1) {
        cells.push({ iso: toIsoDate(new Date(year, month, d)), day: d });
      }
      return { key: `${year}-${month}`, label, cells };
    });
  }, [initialDate, monthOffset]);

  function handleDayClick(iso: string) {
    if (iso < todayIso) return;
    if (isDateBlocked(iso, bookedRanges)) return;

    if (!checkIn || (checkIn && checkOut) || iso <= checkIn) {
      onSelectRange(iso, '');
      return;
    }

    if (rangeHasConflict(checkIn, iso, bookedRanges)) {
      onSelectRange(iso, '');
      return;
    }

    onSelectRange(checkIn, iso);
  }

  return (
    <div className="border border-white/12 bg-[#0D171F] rounded-2xl p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="font-editorial text-[26px] text-white leading-tight">
            Live Availability Calendar
          </h4>
          <p className="text-[13px] text-[#95A7B4] mt-1">
            Select a check-in and check-out date. Crossed dates are currently reserved.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={monthOffset <= 0}
            onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
            aria-label="Previous month"
            className="w-9 h-9 rounded-lg border border-white/12 flex items-center justify-center text-[#E2E9EE] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={monthOffset >= 8}
            onClick={() => setMonthOffset((prev) => Math.min(8, prev + 1))}
            aria-label="Next month"
            className="w-9 h-9 rounded-lg border border-white/12 flex items-center justify-center text-[#E2E9EE] hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {visibleMonths.map((month) => (
          <div key={month.key}>
            <div className="text-[14px] font-medium text-white mb-3 text-center">
              {month.label}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1.5">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-medium text-[#7D91A0] py-1"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {month.cells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-9" />;
                }
                const isPast = cell.iso < todayIso;
                const blocked = isDateBlocked(cell.iso, bookedRanges);
                const isStart = cell.iso === checkIn;
                const isEnd = cell.iso === checkOut;
                const inRange =
                  Boolean(checkIn && checkOut) &&
                  cell.iso > checkIn &&
                  cell.iso < checkOut;

                const disabled = isPast || blocked;

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDayClick(cell.iso)}
                    title={blocked ? 'Already reserved' : cell.iso}
                    className={`h-9 rounded-md text-[12px] font-mono tabular-nums transition-colors flex items-center justify-center ${
                      isStart || isEnd
                        ? 'bg-[#F4EFE6] text-[#0E171D] font-semibold'
                        : inRange
                          ? 'bg-[#F4EFE6]/16 text-[#F4EFE6] font-medium'
                          : blocked
                            ? 'text-[#5D707E] line-through bg-white/[0.03] cursor-not-allowed'
                            : isPast
                              ? 'text-[#394A56] cursor-not-allowed'
                              : 'text-[#DCE5EC] hover:bg-white/[0.08]'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Clear legend (text + visual, never color alone) */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[#95A7B4]">
        <span className="inline-flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-sm bg-[#F4EFE6] inline-block"
            aria-hidden="true"
          />
          Selected stay
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-sm bg-white/[0.04] border border-white/12 inline-flex items-center justify-center text-[9px] text-[#6E8290] line-through"
            aria-hidden="true"
          >
            8
          </span>
          Reserved / unavailable
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-sm bg-[#091117] border border-white/15 inline-block"
            aria-hidden="true"
          />
          Open for instant booking
        </span>
      </div>
    </div>
  );
}
