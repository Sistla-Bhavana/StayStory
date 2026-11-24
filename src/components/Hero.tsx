import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import type { FilterState, Property } from '../types.ts';
import {
  addDaysIso,
  findNextOpenRange,
  formatCurrency,
  getTodayIso,
} from '../lib/dates.ts';
import { SafeImage } from './SafeImage.tsx';

interface HeroProps {
  properties: Property[];
  filters: FilterState;
  onUpdateFilters: (patch: Partial<FilterState>) => void;
  onReserveProperty: (
    property: Property,
    dates?: { checkIn: string; checkOut: string; guests: number }
  ) => void;
}

const COORDINATES: Record<string, string> = {
  'prop-lofoten-skjaer': '67.93° N · 13.09° E',
  'prop-kyoto-kamo': '35.02° N · 135.78° E',
  'prop-bigsur-lobos': '36.27° N · 121.81° W',
  'prop-ravello-pietra': '40.65° N · 14.61° E',
  'prop-zermatt-valais': '46.02° N · 7.75° E',
  'prop-oaxaca-tierra': '17.07° N · 96.72° W',
};

export function Hero({
  properties,
  filters,
  onUpdateFilters,
  onReserveProperty,
}: HeroProps) {
  const today = getTodayIso();

  // Prioritize the atmospheric twilight fjord cabin first to echo the twilight lakeside mood
  const orderedSpotlight = useMemo(() => {
    if (properties.length === 0) return [];
    const lofotenIdx = properties.findIndex((p) => p.id === 'prop-lofoten-skjaer');
    if (lofotenIdx <= 0) return properties;
    return [
      properties[lofotenIdx],
      ...properties.slice(0, lofotenIdx),
      ...properties.slice(lofotenIdx + 1),
    ];
  }, [properties]);

  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const activeProperty =
    orderedSpotlight[spotlightIndex % Math.max(1, orderedSpotlight.length)] ?? null;

  // Local hero card dates synced cleanly with active spotlight property's next open window
  const [cardCheckIn, setCardCheckIn] = useState('');
  const [cardCheckOut, setCardCheckOut] = useState('');
  const [cardGuests, setCardGuests] = useState(2);

  useEffect(() => {
    if (!activeProperty) return;
    if (filters.checkIn && filters.checkOut) {
      setCardCheckIn(filters.checkIn);
      setCardCheckOut(filters.checkOut);
    } else {
      const open = findNextOpenRange(activeProperty.blockedRanges, 3);
      setCardCheckIn(open.checkIn);
      setCardCheckOut(open.checkOut);
    }
    setCardGuests((prev) => Math.min(Math.max(1, prev), activeProperty.maxGuests));
  }, [activeProperty, filters.checkIn, filters.checkOut]);

  const averageCollectionRating = useMemo(() => {
    if (properties.length === 0) return '4.85';
    const sum = properties.reduce((acc, p) => acc + p.rating, 0);
    return (sum / properties.length).toFixed(2);
  }, [properties]);

  const totalReviewCount = useMemo(() => {
    return properties.reduce((acc, p) => acc + p.reviewCount, 0);
  }, [properties]);

  function handleCycle(delta: number) {
    if (orderedSpotlight.length === 0) return;
    setSpotlightIndex(
      (prev) => (prev + delta + orderedSpotlight.length) % orderedSpotlight.length
    );
  }

  function handleReserveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeProperty) return;
    const finalIn = cardCheckIn || addDaysIso(today, 2);
    const finalOut =
      cardCheckOut && cardCheckOut > finalIn ? cardCheckOut : addDaysIso(finalIn, 3);
    onUpdateFilters({
      checkIn: finalIn,
      checkOut: finalOut,
      guests: cardGuests,
    });
    onReserveProperty(activeProperty, {
      checkIn: finalIn,
      checkOut: finalOut,
      guests: cardGuests,
    });
  }

  const backdropSrc =
    activeProperty?.imageUrl ??
    '/src/assets/images/home_lofoten_fjord_1795492040963.jpg';

  const quickHighlights = activeProperty
    ? activeProperty.amenities.slice(0, 3).map((item) => {
        const short = item.split('&')[0].trim();
        return short.length > 22 ? `${short.slice(0, 21).trim()}…` : short;
      })
    : ['Private dock', 'Wood stove', 'Panoramic view'];

  return (
    <section id="top" className="bg-[#091015] px-4 sm:px-6 lg:px-8 pt-5 pb-10">
      {/* Framed Full-Bleed Twilight Hero Viewport */}
      <div className="relative max-w-[1380px] mx-auto rounded-2xl border border-white/15 overflow-hidden min-h-[640px] lg:min-h-[720px] flex flex-col justify-between bg-[#0B141A]">
        {/* Full-bleed atmospheric residence photograph */}
        <div className="absolute inset-0">
          <SafeImage
            src={backdropSrc}
            alt={activeProperty?.title ?? 'Solenne Architectural Retreat'}
            title={activeProperty?.title ?? 'Solenne Architectural Retreat'}
            loading="eager"
            className="w-full h-full object-cover object-center transition-opacity duration-500"
          />
          {/* Measured twilight scrim ensuring crisp >= 4.5:1 legibility across all frames */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#071017]/88 via-[#08131B]/52 to-[#071017]/72"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#071017]/90 via-transparent to-[#071017]/45"
          />
        </div>

        {/* Main Hero Content Grid */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center px-6 sm:px-10 lg:px-14 pt-12 pb-10 lg:py-16">
          {/* Left Editorial Typographic Focal Point */}
          <div className="lg:col-span-7 max-w-[600px]">
            <p className="text-[12px] tracking-[0.14em] text-[#B8C7D1] mb-5">
              Curated Stays · Six Regions · Real-Time Availability
            </p>

            <h1 className="font-sans text-[42px] sm:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.03em] font-medium text-white mb-6">
              Where quiet luxury
              <span className="block font-normal text-[#C8D4DC]">
                meets the wild.
              </span>
            </h1>

            <p className="text-[16px] sm:text-[17px] leading-[1.65] text-[#CBD6DE] max-w-[44ch] mb-8">
              Book thoughtfully designed homestays for slow mornings, quiet air, and
              restorative nights—each backed by live calendars and verified guest reflections.
            </p>

            <div className="flex flex-wrap items-center gap-6">
              <a
                href="#residences"
                className="inline-flex items-center gap-2.5 px-5 py-3 bg-[#F4EFE6] text-[#0E171D] rounded-lg text-[14px] font-medium hover:bg-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6]"
              >
                <span>Browse All Residences</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>

              {activeProperty && (
                <button
                  type="button"
                  onClick={() => onReserveProperty(activeProperty)}
                  className="text-[14px] text-[#E2E9EE] hover:text-white border-b border-white/40 hover:border-white pb-0.5 transition-colors whitespace-nowrap shrink-0"
                >
                  Read {activeProperty.city} Monograph
                </button>
              )}
            </div>
          </div>

          {/* Right Floating Frosted Glass Retreat Booking Card (Mirroring Reference) */}
          <div className="lg:col-span-5 flex lg:justify-end">
            <form
              onSubmit={handleReserveSubmit}
              className="w-full max-w-[390px] bg-[#0B141C]/78 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-2xl"
            >
              {/* Thumbnail Preview inside glass card */}
              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-[#0F1B24] mb-4">
                <SafeImage
                  src={backdropSrc}
                  alt={activeProperty?.title ?? 'Featured retreat'}
                  title={activeProperty?.title}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] tracking-[0.06em] text-white/90 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-md">
                    {activeProperty?.region ?? 'Featured'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCycle(-1)}
                      aria-label="Previous featured residence"
                      className="w-7 h-7 rounded-md bg-black/45 backdrop-blur-md text-white/90 hover:bg-black/70 flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCycle(1)}
                      aria-label="Next featured residence"
                      className="w-7 h-7 rounded-md bg-black/45 backdrop-blur-md text-white/90 hover:bg-black/70 flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Residence Title & Location */}
              <div className="mb-4">
                <h2 className="font-sans text-[20px] font-medium text-white leading-snug tracking-[-0.01em]">
                  {activeProperty?.title ?? 'Skjær Nordic Cabin'}
                </h2>
                <p className="inline-flex items-center gap-1.5 text-[12px] text-[#A2B3BF] mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#D8CFC0]" aria-hidden="true" />
                  <span>{activeProperty?.location ?? 'Lofoten, Norway'}</span>
                </p>
              </div>

              {/* Arrival & Departure Date Fields */}
              <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                <label className="block bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 hover:border-white/25 transition-colors">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#95A7B4] mb-1">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    Arrival
                  </span>
                  <input
                    type="date"
                    min={today}
                    value={cardCheckIn}
                    onChange={(e) => {
                      const nextIn = e.target.value;
                      setCardCheckIn(nextIn);
                      if (cardCheckOut && nextIn && cardCheckOut <= nextIn) {
                        setCardCheckOut(addDaysIso(nextIn, 3));
                      }
                    }}
                    className="w-full bg-transparent font-mono text-[12px] text-[#F4F6F7] tabular-nums focus:outline-none"
                  />
                </label>

                <label className="block bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 hover:border-white/25 transition-colors">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#95A7B4] mb-1">
                    <Calendar className="w-3 h-3" aria-hidden="true" />
                    Departure
                  </span>
                  <input
                    type="date"
                    min={cardCheckIn || today}
                    value={cardCheckOut}
                    onChange={(e) => setCardCheckOut(e.target.value)}
                    className="w-full bg-transparent font-mono text-[12px] text-[#F4F6F7] tabular-nums focus:outline-none"
                  />
                </label>
              </div>

              {/* Guests Field */}
              <label className="block bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 mb-4 hover:border-white/25 transition-colors">
                <span className="flex items-center gap-1.5 text-[11px] text-[#95A7B4] mb-0.5">
                  <Users className="w-3 h-3" aria-hidden="true" />
                  Guests
                </span>
                <select
                  value={cardGuests}
                  onChange={(e) => setCardGuests(Number(e.target.value))}
                  className="w-full bg-transparent text-[13px] font-medium text-[#F4F6F7] focus:outline-none"
                >
                  {Array.from(
                    { length: activeProperty?.maxGuests ?? 4 },
                    (_, i) => i + 1
                  ).map((n) => (
                    <option key={n} value={n} className="bg-[#0D171F] text-white">
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </label>

              {/* Quiet Unboxed Amenity Metadata Row */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#9EB0BC] pb-4 mb-4 border-b border-white/10">
                {quickHighlights.map((item, idx) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              {/* Price & View Details Row */}
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[22px] font-medium text-white tabular-nums">
                    {formatCurrency(activeProperty?.pricePerNight ?? 285)}
                  </span>
                  <span className="text-[12px] text-[#95A7B4]">/ night</span>
                </div>

                {activeProperty && (
                  <button
                    type="button"
                    onClick={() => onReserveProperty(activeProperty)}
                    className="text-[12px] text-[#CBD6DE] hover:text-white transition-colors whitespace-nowrap"
                  >
                    View details →
                  </button>
                )}
              </div>

              {/* Primary Ivory CTA matching reference */}
              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#F4EFE6] hover:bg-white text-[#0E171D] rounded-lg text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6]"
              >
                <span>Reserve Retreat</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Atmospheric Trust & Location Bar (Mirroring Reference Footer Strip) */}
        <div className="relative z-10 border-t border-white/12 bg-[#081016]/55 backdrop-blur-md px-6 sm:px-10 lg:px-14 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[12px] text-[#B8C7D1]">
          <a
            href="#guest-voices"
            className="inline-flex items-center gap-2.5 hover:text-white transition-colors"
          >
            <span className="inline-flex items-center gap-0.5 text-[#E5A952]" aria-hidden="true">
              <Star className="w-3.5 h-3.5 fill-current" />
              <Star className="w-3.5 h-3.5 fill-current" />
              <Star className="w-3.5 h-3.5 fill-current" />
              <Star className="w-3.5 h-3.5 fill-current" />
              <Star className="w-3.5 h-3.5 fill-current" />
            </span>
            <span className="font-mono font-medium text-white tabular-nums">
              {averageCollectionRating}
            </span>
            <span className="text-[#95A7B4]">
              from {totalReviewCount} verified guest stays
            </span>
          </a>

          <div className="inline-flex items-center gap-2 text-[#CBD6DE]">
            <Compass className="w-4 h-4 text-[#D8CFC0]" aria-hidden="true" />
            <span>Architectural stays · Nature-led hospitality</span>
          </div>

          <div className="font-mono text-[11px] tracking-[0.06em] text-[#95A7B4] tabular-nums">
            {activeProperty
              ? `${COORDINATES[activeProperty.id] ?? activeProperty.location} · 0${
                  (spotlightIndex % Math.max(1, orderedSpotlight.length)) + 1
                } / 0${orderedSpotlight.length}`
              : '67.93° N · 13.09° E'}
          </div>
        </div>
      </div>
    </section>
  );
}
