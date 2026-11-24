import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, Trees } from 'lucide-react';
import type { Booking, FilterState, Property } from './types.ts';
import {
  cancelBooking,
  fetchFeaturedReviews,
  fetchMyBookings,
  fetchProperties,
  type FeaturedReview,
} from './lib/api.ts';
import { BookingsDrawer } from './components/BookingsDrawer.tsx';
import { EditorialJournal } from './components/EditorialJournal.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { PropertyCard } from './components/PropertyCard.tsx';
import { PropertyDetailModal } from './components/PropertyDetailModal.tsx';

const DEFAULT_FILTERS: FilterState = {
  location: 'All',
  search: '',
  minPrice: 0,
  maxPrice: 650,
  minRating: 0,
  checkIn: '',
  checkOut: '',
  guests: 1,
  sort: 'curated',
};

export default function App() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [properties, setProperties] = useState<Property[]>([]);
  const [allCatalogProperties, setAllCatalogProperties] = useState<Property[]>([]);
  const [regions, setRegions] = useState<string[]>([
    'Kyoto',
    'Big Sur',
    'Ravello',
    'Zermatt',
    'Oaxaca',
    'Lofoten',
  ]);
  const [totalCatalogCount, setTotalCatalogCount] = useState(6);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [featuredReviews, setFeaturedReviews] = useState<FeaturedReview[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [modalInitialBooking, setModalInitialBooking] = useState<{
    checkIn: string;
    checkOut: string;
    guests: number;
  } | null>(null);
  const [bookingsDrawerOpen, setBookingsDrawerOpen] = useState(false);

  const residencesRef = useRef<HTMLElement | null>(null);

  const loadFilteredProperties = useCallback(async (activeFilters: FilterState) => {
    setLoadingProperties(true);
    setLoadError(null);
    try {
      const data = await fetchProperties(activeFilters);
      setProperties(data.properties);
      setTotalCatalogCount(data.totalCatalogCount);
      if (data.regions.length > 0) setRegions(data.regions);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load residences.');
    } finally {
      setLoadingProperties(false);
    }
  }, []);

  const loadCatalogAndMeta = useCallback(async () => {
    try {
      const [catalogRes, reviewsRes, bookingsRes] = await Promise.all([
        fetchProperties(DEFAULT_FILTERS),
        fetchFeaturedReviews(),
        fetchMyBookings(),
      ]);
      setAllCatalogProperties(catalogRes.properties);
      setFeaturedReviews(reviewsRes.reviews);
      setBookings(bookingsRes.bookings);
    } catch {
      // Non-blocking background refresh
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFilteredProperties(filters);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [filters, loadFilteredProperties]);

  useEffect(() => {
    void loadCatalogAndMeta();
  }, [loadCatalogAndMeta]);

  function handleUpdateFilters(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function scrollToResidences() {
    residencesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openPropertyModal(
    propertyId: string,
    overrideDates?: { checkIn: string; checkOut: string; guests: number }
  ) {
    setModalInitialBooking(overrideDates ?? null);
    setSelectedPropertyId(propertyId);
  }

  async function handleCancelBooking(bookingId: string) {
    await cancelBooking(bookingId);
    await Promise.all([loadFilteredProperties(filters), loadCatalogAndMeta()]);
  }

  function handleDataMutated() {
    void Promise.all([loadFilteredProperties(filters), loadCatalogAndMeta()]);
  }

  const catalogList = allCatalogProperties.length > 0 ? allCatalogProperties : properties;
  const activeBookingCount = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#091015] text-[#F4F6F7]">
      {/* Dark Frosted 3-Zone Top Bar */}
      <Header
        activeBookingCount={activeBookingCount}
        onOpenBookings={() => setBookingsDrawerOpen(true)}
        onReserveClick={scrollToResidences}
      />

      <main className="flex-1">
        {/* Section 1: Atmospheric Twilight Hero with Floating Glass Retreat Booking Card */}
        <Hero
          properties={catalogList}
          filters={filters}
          onUpdateFilters={handleUpdateFilters}
          onReserveProperty={(prop, dates) => openPropertyModal(prop.id, dates)}
        />

        {/* Section 2: Curated Collection + Price, Location, Date & Guest Rating Filters */}
        <section
          id="residences"
          ref={residencesRef}
          className="max-w-[1360px] mx-auto px-6 lg:px-10 py-16 lg:py-20"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[12px] tracking-[0.12em] text-[#8FA2B0] mb-2">
                The Collection
              </p>
              <h2 className="font-sans text-[34px] sm:text-[42px] leading-[1.08] tracking-[-0.02em] font-medium text-white">
                Six privately hosted retreats.
              </h2>
            </div>
            {filters.checkIn && filters.checkOut && (
              <div className="text-[13px] text-[#F4EFE6] font-medium">
                Showing stays open from{' '}
                <span className="font-mono tabular-nums">{filters.checkIn}</span> to{' '}
                <span className="font-mono tabular-nums">{filters.checkOut}</span>
              </div>
            )}
          </div>

          <FilterBar
            filters={filters}
            regions={regions}
            matchCount={properties.length}
            totalCount={totalCatalogCount}
            onUpdate={handleUpdateFilters}
            onReset={handleResetFilters}
          />

          {loadingProperties ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#9EB0BC]">
              <Loader2 className="w-6 h-6 animate-spin text-[#F4EFE6]" aria-hidden="true" />
              <span className="text-[14px]">Updating residence availability...</span>
            </div>
          ) : loadError ? (
            <div className="bg-[#0D171F] border border-white/12 rounded-2xl p-12 text-center">
              <p className="font-editorial text-[28px] text-white mb-2">
                Could not load residences
              </p>
              <p className="text-[14px] text-[#9EB0BC] mb-6">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadFilteredProperties(filters)}
                className="px-5 py-2.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium"
              >
                Try Again
              </button>
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-[#0D171F] border border-white/12 rounded-2xl p-14 text-center">
              <p className="font-editorial text-[32px] text-white mb-2">
                No retreats match those criteria
              </p>
              <p className="text-[14px] text-[#9EB0BC] max-w-md mx-auto mb-6">
                Try widening your maximum nightly rate, adjusting your guest rating threshold,
                or selecting different stay dates.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium hover:bg-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onSelect={(prop) => openPropertyModal(prop.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Editorial Storytelling & Adjacent Guest Voices */}
        <EditorialJournal
          properties={catalogList}
          featuredReviews={featuredReviews}
          onSelectPropertyById={(id) => openPropertyModal(id)}
        />
      </main>

      {/* Quiet Nocturnal Footer */}
      <footer className="border-t border-white/10 bg-[#091015]">
        <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 text-[18px] font-medium text-white">
              <Trees className="w-4 h-4 text-[#F4EFE6]" strokeWidth={1.75} aria-hidden="true" />
              <span>Solenne</span>
            </span>
            <p className="text-[13px] text-[#8FA2B0] mt-1.5">
              Architectural homestays curated across Kyoto, Big Sur, Ravello, Zermatt, Oaxaca,
              and Lofoten.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13px] text-[#9EB0BC]">
            <a href="#residences" className="hover:text-white transition-colors">
              Stays
            </a>
            <a href="#journal" className="hover:text-white transition-colors">
              Journal
            </a>
            <a href="#guest-voices" className="hover:text-white transition-colors">
              Guest Stories
            </a>
            <button
              type="button"
              onClick={() => setBookingsDrawerOpen(true)}
              className="hover:text-white transition-colors"
            >
              My Bookings
            </button>
            <span className="text-[#5D707E]">© 2026 Solenne Homes</span>
          </div>
        </div>
      </footer>

      {/* Full-Screen Editorial Residence Monograph + Real-Time Booking & Reviews */}
      {selectedPropertyId && (
        <PropertyDetailModal
          propertyId={selectedPropertyId}
          initialCheckIn={modalInitialBooking?.checkIn ?? filters.checkIn}
          initialCheckOut={modalInitialBooking?.checkOut ?? filters.checkOut}
          initialGuests={modalInitialBooking?.guests ?? filters.guests}
          onClose={() => {
            setSelectedPropertyId(null);
            setModalInitialBooking(null);
          }}
          onDataMutated={handleDataMutated}
          onOpenBookingsDrawer={() => setBookingsDrawerOpen(true)}
        />
      )}

      {/* Slide-Over Bookings & Receipt Manager */}
      <BookingsDrawer
        open={bookingsDrawerOpen}
        bookings={bookings}
        onClose={() => setBookingsDrawerOpen(false)}
        onCancelBooking={handleCancelBooking}
        onOpenProperty={(id) => openPropertyModal(id)}
      />
    </div>
  );
}
