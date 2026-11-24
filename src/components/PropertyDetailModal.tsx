import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import type {
  Booking,
  DateRange,
  Property,
  Review,
  ReviewDimensions,
} from '../types.ts';
import { fetchPropertyDetail } from '../lib/api.ts';
import { findNextOpenRange } from '../lib/dates.ts';
import { AvailabilityCalendar } from './AvailabilityCalendar.tsx';
import { BookingPanel } from './BookingPanel.tsx';
import { ReviewsSection } from './ReviewsSection.tsx';
import { SafeImage } from './SafeImage.tsx';

interface PropertyDetailModalProps {
  propertyId: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
  onClose: () => void;
  onDataMutated: () => void;
  onOpenBookingsDrawer: () => void;
}

export function PropertyDetailModal({
  propertyId,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  onClose,
  onDataMutated,
  onOpenBookingsDrawer,
}: PropertyDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dimensionAverages, setDimensionAverages] = useState<ReviewDimensions>({
    cleanliness: 5,
    location: 5,
    hospitality: 5,
    architecture: 5,
  });
  const [bookedRanges, setBookedRanges] = useState<DateRange[]>([]);

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPropertyDetail(propertyId)
      .then((detail) => {
        if (cancelled) return;
        setProperty(detail.property);
        setReviews(detail.reviews);
        setDimensionAverages(detail.dimensionAverages);
        setBookedRanges(detail.bookedRanges);
        setGuests((prev) => Math.min(Math.max(1, prev), detail.property.maxGuests));

        if (!initialCheckIn || !initialCheckOut) {
          const open = findNextOpenRange(detail.bookedRanges, 3);
          setCheckIn(open.checkIn);
          setCheckOut(open.checkOut);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load residence monograph.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, initialCheckIn, initialCheckOut]);

  function handleBookingConfirmed(booking: Booking) {
    setBookedRanges((prev) => [
      ...prev,
      { checkIn: booking.checkIn, checkOut: booking.checkOut, reason: 'Confirmed Booking' },
    ]);
    onDataMutated();
  }

  function handleReviewSubmitted(payload: {
    property: Property;
    reviews: Review[];
    dimensionAverages: ReviewDimensions;
  }) {
    setProperty(payload.property);
    setReviews(payload.reviews);
    setDimensionAverages(payload.dimensionAverages);
    onDataMutated();
  }

  return (
    <div
      className="fixed inset-0 z-40 bg-[#091015] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={property ? `${property.title} Residence Monograph` : 'Residence Monograph'}
    >
      {/* Top sticky monograph bar */}
      <div className="sticky top-0 z-20 bg-[#091015]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-[14px] text-[#B8C5CE] hover:text-white transition-colors whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Stays</span>
          </button>

          {property && (
            <span className="hidden sm:inline text-[13px] text-[#8FA2B0] truncate">
              Chapter {property.editorial.chapterNumber} · {property.title} · {property.location}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close residence monograph"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#9EB0BC] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 lg:py-14">
        {loading && (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#9EB0BC]">
            <Loader2 className="w-6 h-6 animate-spin text-[#F4EFE6]" aria-hidden="true" />
            <span className="text-[14px]">Opening residence monograph...</span>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-lg mx-auto py-20 text-center">
            <p className="font-editorial text-[30px] text-white mb-2">
              Unable to load residence
            </p>
            <p className="text-[14px] text-[#9EB0BC] mb-6">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium"
            >
              Return to Stays
            </button>
          </div>
        )}

        {property && !loading && (
          <div>
            {/* Editorial Title Block */}
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#8FA2B0] mb-3">
                <span>Chapter {property.editorial.chapterNumber}</span>
                <span aria-hidden="true">·</span>
                <span>{property.location}</span>
                <span aria-hidden="true">·</span>
                <span>{property.architect}</span>
              </div>
              <h1 className="font-sans text-[38px] sm:text-[50px] leading-[1.06] tracking-[-0.02em] font-medium text-white mb-3">
                {property.title}
              </h1>
              <p className="text-[16px] text-[#A8B8C4] max-w-[65ch]">
                {property.subtitle}
              </p>
            </header>

            {/* Full-bleed Architectural Photograph */}
            <figure className="mb-10">
              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#0D171F] border border-white/10">
                <SafeImage
                  src={property.imageUrl}
                  alt={property.title}
                  title={property.title}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#8FA2B0]">
                <span>{property.imageCaption}</span>
                <span className="font-mono tabular-nums">
                  {property.areaSqm} m² · {property.bedrooms} Bed · {property.bathrooms} Bath ·{' '}
                  {property.yearBuilt}
                </span>
              </figcaption>
            </figure>

            {/* Two-column layout: Editorial Story + Calendar + Reviews (Left) | Sticky Booking & Payment (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Editorial Monograph */}
              <div className="lg:col-span-7 space-y-12">
                <section className="space-y-6">
                  <p className="font-editorial text-[28px] sm:text-[32px] leading-[1.35] text-[#F4EFE6]">
                    {property.editorial.lead}
                  </p>

                  {property.editorial.paragraphs.map((para, idx) => (
                    <p
                      key={idx}
                      className="text-[15px] leading-[1.78] text-[#CBD6DE] max-w-[68ch]"
                    >
                      {para}
                    </p>
                  ))}

                  <blockquote className="my-8 py-6 border-y border-white/12">
                    <p className="font-editorial italic text-[27px] leading-[1.35] text-[#E6DFD2]">
                      “{property.editorial.pullQuote}”
                    </p>
                  </blockquote>

                  {/* Material & Light Study */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div className="bg-[#0D171F] border border-white/10 rounded-xl p-5">
                      <p className="text-[12px] text-[#8FA2B0] mb-2">Natural Light Study</p>
                      <p className="text-[14px] leading-[1.65] text-[#DCE5EC]">
                        {property.editorial.lightNote}
                      </p>
                    </div>
                    <div className="bg-[#0D171F] border border-white/10 rounded-xl p-5">
                      <p className="text-[12px] text-[#8FA2B0] mb-2">Material Palette</p>
                      <p className="text-[14px] leading-[1.65] text-[#DCE5EC]">
                        {property.editorial.materialsNote}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Interactive Real-Time Availability Calendar */}
                <section>
                  <AvailabilityCalendar
                    bookedRanges={bookedRanges}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onSelectRange={(nextIn, nextOut) => {
                      setCheckIn(nextIn);
                      setCheckOut(nextOut);
                    }}
                  />
                </section>

                {/* Amenities & House Guidelines */}
                <section className="pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div>
                    <h3 className="font-editorial text-[28px] text-white mb-4">
                      Included Amenities
                    </h3>
                    <ul className="space-y-2.5 text-[14px] text-[#CBD6DE]">
                      {property.amenities.map((item) => (
                        <li key={item} className="flex items-start gap-2.5">
                          <Check
                            className="w-4 h-4 text-[#F4EFE6] shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-editorial text-[28px] text-white mb-4">
                      House Stewardship
                    </h3>
                    <ul className="space-y-2.5 text-[14px] text-[#9EB0BC] mb-6">
                      {property.houseRules.map((rule) => (
                        <li key={rule} className="leading-[1.6]">
                          {rule}
                        </li>
                      ))}
                    </ul>

                    <div className="pt-5 border-t border-white/10">
                      <p className="text-[12px] text-[#8FA2B0] mb-1">Hosted by</p>
                      <p className="text-[15px] font-medium text-white">
                        {property.host.name}
                      </p>
                      <p className="text-[12px] text-[#8FA2B0] mb-3">
                        {property.host.role} · {property.host.yearsHosting} years hosting ·
                        Replies {property.host.responseTime.toLowerCase()}
                      </p>
                      <p className="text-[13px] leading-[1.68] text-[#9EB0BC]">
                        {property.host.bio}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Verified Guest Reviews & Live Submission */}
                <ReviewsSection
                  property={property}
                  reviews={reviews}
                  dimensionAverages={dimensionAverages}
                  onReviewSubmitted={handleReviewSubmitted}
                />
              </div>

              {/* Right Column: Contiguous Sticky Booking & Payment Checkout */}
              <aside className="lg:col-span-5 lg:sticky lg:top-24">
                <BookingPanel
                  property={property}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guests={guests}
                  onChangeDates={(nextIn, nextOut) => {
                    setCheckIn(nextIn);
                    setCheckOut(nextOut);
                  }}
                  onChangeGuests={setGuests}
                  onBookingConfirmed={handleBookingConfirmed}
                  onOpenBookingsDrawer={() => {
                    onClose();
                    onOpenBookingsDrawer();
                  }}
                />
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
