import { Calendar, RotateCcw, Search, SlidersHorizontal, Star } from 'lucide-react';
import type { FilterState } from '../types.ts';
import { getTodayIso } from '../lib/dates.ts';

interface FilterBarProps {
  filters: FilterState;
  regions: string[];
  matchCount: number;
  totalCount: number;
  onUpdate: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '4.7+', value: 4.7 },
  { label: '4.85+', value: 4.85 },
  { label: '4.95+', value: 4.95 },
];

export function FilterBar({
  filters,
  regions,
  matchCount,
  totalCount,
  onUpdate,
  onReset,
}: FilterBarProps) {
  const today = getTodayIso();
  const hasActiveFilters =
    filters.location !== 'All' ||
    filters.search.trim() !== '' ||
    filters.maxPrice < 650 ||
    filters.minRating > 0 ||
    filters.guests > 1 ||
    Boolean(filters.checkIn && filters.checkOut);

  return (
    <div className="mb-10 bg-[#0D171F]/80 backdrop-blur-md border border-white/12 rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Top row: Region selector tabs + Sort & count */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
        <div
          role="tablist"
          aria-label="Filter residences by region"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0"
        >
          {['All', ...regions].map((region) => {
            const active = filters.location === region;
            return (
              <button
                key={region}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onUpdate({ location: region })}
                className={`px-3.5 py-2 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6] ${
                  active
                    ? 'bg-[#F4EFE6] text-[#0E171D]'
                    : 'text-[#9EB0BC] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {region === 'All' ? 'All Regions' : region}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <span className="text-[13px] text-[#95A7B4] tabular-nums whitespace-nowrap">
            Showing {matchCount} of {totalCount} retreats
          </span>
          <label className="flex items-center gap-2 text-[13px] text-[#95A7B4]">
            <span className="sr-only">Sort residences</span>
            <select
              value={filters.sort}
              onChange={(e) =>
                onUpdate({ sort: e.target.value as FilterState['sort'] })
              }
              className="bg-[#091117] border border-white/15 rounded-lg px-3 py-1.5 text-[13px] text-[#F4F6F7] focus:outline-none focus:border-[#F4EFE6]"
            >
              <option value="curated" className="bg-[#0D171F]">Curated order</option>
              <option value="price_asc" className="bg-[#0D171F]">Price: Low to high</option>
              <option value="price_desc" className="bg-[#0D171F]">Price: High to low</option>
              <option value="rating_desc" className="bg-[#0D171F]">Highest guest rating</option>
            </select>
          </label>
        </div>
      </div>

      {/* Bottom row: Search, Dates, Price ceiling, Guest ratings */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
        {/* Keyword search */}
        <div className="md:col-span-3">
          <label className="block text-[12px] text-[#95A7B4] mb-2">
            Search residence or location
          </label>
          <div className="relative">
            <Search
              className="w-4 h-4 text-[#7D91A0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onUpdate({ search: e.target.value })}
              placeholder="Fjord, cedar, Kyoto..."
              className="w-full bg-white/[0.04] border border-white/12 rounded-lg pl-10 pr-3.5 py-2.5 text-[13px] text-[#F4F6F7] placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
            />
          </div>
        </div>

        {/* Real-time Availability Date Filter */}
        <div className="md:col-span-3">
          <span className="flex items-center gap-1.5 text-[12px] text-[#95A7B4] mb-2">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            Filter by open dates
          </span>
          <div className="grid grid-cols-2 bg-white/[0.04] border border-white/12 rounded-lg divide-x divide-white/10 h-[42px]">
            <input
              type="date"
              min={today}
              value={filters.checkIn}
              aria-label="Filter check-in date"
              onChange={(e) => {
                const nextIn = e.target.value;
                onUpdate({
                  checkIn: nextIn,
                  checkOut:
                    filters.checkOut && nextIn && filters.checkOut <= nextIn
                      ? ''
                      : filters.checkOut,
                });
              }}
              className="bg-transparent px-2.5 font-mono text-[11px] text-[#F4F6F7] tabular-nums focus:outline-none w-full"
            />
            <input
              type="date"
              min={filters.checkIn || today}
              value={filters.checkOut}
              aria-label="Filter check-out date"
              onChange={(e) => onUpdate({ checkOut: e.target.value })}
              className="bg-transparent px-2.5 font-mono text-[11px] text-[#F4F6F7] tabular-nums focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Max nightly price slider */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <span className="text-[#95A7B4] flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Max nightly rate
            </span>
            <span className="font-mono text-[#F4EFE6] font-medium tabular-nums">
              {filters.maxPrice >= 650 ? '$650+' : `$${filters.maxPrice}`}
            </span>
          </div>
          <div className="h-[42px] px-3 bg-white/[0.04] border border-white/12 rounded-lg flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-[#7D91A0] tabular-nums">$200</span>
            <input
              type="range"
              min={200}
              max={650}
              step={25}
              value={filters.maxPrice}
              onChange={(e) => onUpdate({ maxPrice: Number(e.target.value) })}
              aria-label="Maximum nightly price in US dollars"
              className="solenne-range w-full"
            />
            <span className="font-mono text-[11px] text-[#7D91A0] tabular-nums">$650</span>
          </div>
        </div>

        {/* Guest Rating threshold */}
        <div className="md:col-span-3">
          <div className="flex items-center justify-between text-[12px] mb-2">
            <span className="text-[#95A7B4] flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[#E5A952]" aria-hidden="true" />
              Guest rating
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-[12px] text-[#F4EFE6] hover:underline whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 bg-white/[0.04] border border-white/12 rounded-lg p-1 gap-1 h-[42px]">
            {RATING_OPTIONS.map((opt) => {
              const active = filters.minRating === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onUpdate({ minRating: opt.value })}
                  className={`text-[12px] font-medium rounded-md transition-colors whitespace-nowrap tabular-nums focus-visible:outline-2 focus-visible:outline-[#F4EFE6] ${
                    active
                      ? 'bg-[#F4EFE6] text-[#0E171D]'
                      : 'text-[#9EB0BC] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
