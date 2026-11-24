import { useState } from 'react';
import { Calendar, CreditCard, ShieldCheck, X } from 'lucide-react';
import type { Booking } from '../types.ts';
import { formatCurrency, formatShortDate } from '../lib/dates.ts';
import { SafeImage } from './SafeImage.tsx';

interface BookingsDrawerProps {
  open: boolean;
  bookings: Booking[];
  onClose: () => void;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onOpenProperty: (propertyId: string) => void;
}

export function BookingsDrawer({
  open,
  bookings,
  onClose,
  onCancelBooking,
  onOpenProperty,
}: BookingsDrawerProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirmCancel(bookingId: string) {
    setCancellingId(bookingId);
    setErrorMsg(null);
    try {
      await onCancelBooking(bookingId);
      setConfirmCancelId(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="My Bookings"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-[520px] bg-[#0B131A] h-full flex flex-col border-l border-white/15 shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-[#0E1820] border-b border-white/10 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-sans text-[22px] font-medium text-white leading-none">
              My Bookings
            </h2>
            <p className="text-[13px] text-[#8FA2B0] mt-1.5">
              Real-time reservations & payment receipts for this session
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bookings drawer"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#9EB0BC] hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-500/15 border border-red-400/30 text-[13px] text-red-200">
              {errorMsg}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="bg-[#0E1820] border border-white/10 rounded-2xl p-8 text-center">
              <p className="font-editorial text-[28px] text-white mb-2">
                No reservations yet
              </p>
              <p className="text-[14px] text-[#9EB0BC] leading-relaxed mb-6">
                Select any architectural retreat to check live calendar availability, review
                itemized pricing, and confirm your stay.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium hover:bg-white transition-colors"
              >
                Explore Stays
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const isConfirmed = booking.status === 'confirmed';
              return (
                <article
                  key={booking.id}
                  className="bg-[#0E1820] border border-white/12 rounded-2xl overflow-hidden"
                >
                  <div className="flex gap-4 p-5 border-b border-white/10">
                    <div className="w-24 h-20 rounded-xl shrink-0 bg-[#091117] overflow-hidden">
                      <SafeImage
                        src={booking.propertyImage}
                        alt={booking.propertyTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[12px] mb-1">
                        <span className="font-mono text-[#F4EFE6] font-medium tabular-nums">
                          {booking.confirmationCode}
                        </span>
                        <span
                          className={`font-medium ${
                            isConfirmed ? 'text-emerald-300' : 'text-[#8FA2B0]'
                          }`}
                        >
                          {isConfirmed ? 'Confirmed' : 'Cancelled · Refunded'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProperty(booking.propertyId);
                        }}
                        className="font-sans text-[18px] font-medium text-white hover:text-[#F4EFE6] transition-colors text-left leading-tight block truncate"
                      >
                        {booking.propertyTitle}
                      </button>
                      <p className="text-[12px] text-[#8FA2B0] mt-0.5">
                        {booking.propertyLocation}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 text-[13px]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[#8FA2B0]">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        Stay dates
                      </span>
                      <span className="font-mono tabular-nums text-white">
                        {formatShortDate(booking.checkIn)} — {formatShortDate(booking.checkOut)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[#8FA2B0]">Primary guest</span>
                      <span className="text-[#E2E9EE]">
                        {booking.guestName} · {booking.guests}{' '}
                        {booking.guests === 1 ? 'guest' : 'guests'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[#8FA2B0]">
                        <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                        Payment
                      </span>
                      <span className="font-mono tabular-nums text-[#E2E9EE]">
                        {booking.payment.brand} ···· {booking.payment.last4}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[#9EB0BC]">
                        Total ({booking.nights} {booking.nights === 1 ? 'night' : 'nights'})
                      </span>
                      <span className="font-mono text-[15px] font-medium text-white tabular-nums">
                        {formatCurrency(booking.pricing.total)}
                      </span>
                    </div>

                    {isConfirmed && (
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#9EB0BC]">
                          <ShieldCheck
                            className="w-3.5 h-3.5 text-emerald-300"
                            aria-hidden="true"
                          />
                          Free cancellation releases dates immediately
                        </span>

                        {confirmCancelId === booking.id ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmCancelId(null)}
                              className="text-[12px] text-[#9EB0BC] hover:text-white px-2 py-1"
                            >
                              Keep
                            </button>
                            <button
                              type="button"
                              disabled={cancellingId === booking.id}
                              onClick={() => handleConfirmCancel(booking.id)}
                              className="text-[12px] font-medium text-white bg-red-600 hover:bg-red-500 rounded-md px-3 py-1.5 disabled:opacity-50"
                            >
                              {cancellingId === booking.id ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(booking.id)}
                            className="text-[12px] font-medium text-[#9EB0BC] hover:text-red-300 underline underline-offset-4 whitespace-nowrap shrink-0"
                          >
                            Cancel stay
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
