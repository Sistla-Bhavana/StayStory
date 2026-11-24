import { ChevronDown, Trees } from 'lucide-react';

interface HeaderProps {
  activeBookingCount: number;
  onOpenBookings: () => void;
  onReserveClick: () => void;
}

export function Header({
  activeBookingCount,
  onOpenBookings,
  onReserveClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#091015]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand mark + wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-[18px] font-medium tracking-[-0.01em] text-[#F4F6F7] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4EFE6]"
        >
          <Trees className="w-5 h-5 text-[#F4EFE6]" strokeWidth={1.75} aria-hidden="true" />
          <span>Solenne</span>
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-8 text-[13px] font-normal tracking-[0.01em] text-[#B8C5CE]"
        >
          <a
            href="#residences"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-white/50"
          >
            Stays
          </a>
          <a
            href="#journal"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-white/50"
          >
            Journal
          </a>
          <a
            href="#guest-voices"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-white/50"
          >
            Guest Stories
          </a>
          <button
            type="button"
            onClick={onOpenBookings}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-white/50"
          >
            {activeBookingCount > 0 ? `My Bookings (${activeBookingCount})` : 'My Bookings'}
          </button>
        </nav>

        {/* Zone 3: 1 luminous ivory primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onReserveClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-[#0E171D] bg-[#F4EFE6] hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6]"
          >
            <span>Plan Your Stay</span>
            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
