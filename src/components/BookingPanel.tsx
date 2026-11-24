import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Star,
} from 'lucide-react';
import type { AvailabilityResponse, Booking, Property } from '../types.ts';
import { checkAvailability, createBooking, tokenizePaymentCard } from '../lib/api.ts';
import {
  detectBrandLabel,
  formatCardNumberInput,
  formatCurrency,
  formatShortDate,
  getTodayIso,
} from '../lib/dates.ts';

interface BookingPanelProps {
  property: Property;
  checkIn: string;
  checkOut: string;
  guests: number;
  onChangeDates: (checkIn: string, checkOut: string) => void;
  onChangeGuests: (guests: number) => void;
  onBookingConfirmed: (booking: Booking) => void;
  onOpenBookingsDrawer: () => void;
}

type BookingStep = 'dates' | 'checkout' | 'confirmed';

export function BookingPanel({
  property,
  checkIn,
  checkOut,
  guests,
  onChangeDates,
  onChangeGuests,
  onBookingConfirmed,
  onOpenBookingsDrawer,
}: BookingPanelProps) {
  const today = getTodayIso();
  const [step, setStep] = useState<BookingStep>('dates');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Guest details
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Payment details (tokenized client -> tokenization endpoint; never persisted)
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Real-time server availability & pricing check whenever dates or guests change
  useEffect(() => {
    if (!checkIn || !checkOut) {
      setAvailability(null);
      setCheckError(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setCheckError(null);

    checkAvailability({
      propertyId: property.id,
      checkIn,
      checkOut,
      guests,
    })
      .then((res) => {
        if (!cancelled) {
          setAvailability(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAvailability(null);
          setCheckError(err instanceof Error ? err.message : 'Unable to check availability.');
        }
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [property.id, checkIn, checkOut, guests]);

  function fillTestPaymentDetails() {
    if (!guestName) setGuestName('Elena Vance');
    if (!guestEmail) setGuestEmail('elena.vance@example.com');
    if (!guestPhone) setGuestPhone('+1 (415) 555-0194');
    setCardholderName(guestName || 'Elena Vance');
    setCardNumber('4242 4242 4242 4242');
    setExpMonth('12');
    setExpYear('29');
    setCvc('424');
    setPaymentError(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!availability?.available || !availability.pricing) return;

    setPaymentError(null);
    setProcessing(true);

    try {
      const tokenRes = await tokenizePaymentCard({
        cardholderName: cardholderName.trim() || guestName.trim(),
        cardNumber,
        expMonth,
        expYear,
        cvc,
      });

      const { booking } = await createBooking({
        propertyId: property.id,
        checkIn,
        checkOut,
        guests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        paymentToken: tokenRes.paymentToken,
      });

      setCardNumber('');
      setCvc('');
      setConfirmedBooking(booking);
      setStep('confirmed');
      onBookingConfirmed(booking);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Payment could not be processed.'
      );
    } finally {
      setProcessing(false);
    }
  }

  const cardBrand = detectBrandLabel(cardNumber);

  // Step 3: Instant Confirmed Receipt
  if (step === 'confirmed' && confirmedBooking) {
    return (
      <div className="bg-[#0D171F]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-7 space-y-6 shadow-2xl">
        <div className="flex items-start gap-3 pb-5 border-b border-white/10">
          <CheckCircle2
            className="w-6 h-6 text-emerald-300 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-[12px] text-emerald-300 font-medium mb-1">
              Reservation Confirmed · Payment Captured
            </p>
            <h3 className="font-editorial text-[30px] text-white leading-tight">
              Your retreat is reserved.
            </h3>
            <p className="font-mono text-[13px] text-[#9EB0BC] mt-1 tabular-nums">
              Confirmation {confirmedBooking.confirmationCode}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-[13px]">
          <div className="flex justify-between gap-4">
            <span className="text-[#8FA2B0]">Residence</span>
            <span className="text-white font-medium text-right">
              {confirmedBooking.propertyTitle}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8FA2B0]">Dates</span>
            <span className="font-mono text-white tabular-nums text-right">
              {formatShortDate(confirmedBooking.checkIn)} —{' '}
              {formatShortDate(confirmedBooking.checkOut)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8FA2B0]">Guests</span>
            <span className="text-[#E2E9EE]">
              {confirmedBooking.guestName} ({confirmedBooking.guests})
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8FA2B0]">Receipt sent to</span>
            <span className="text-[#E2E9EE] truncate">{confirmedBooking.guestEmail}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8FA2B0]">Payment method</span>
            <span className="font-mono text-white tabular-nums">
              {confirmedBooking.payment.brand} ···· {confirmedBooking.payment.last4}
            </span>
          </div>
          <div className="pt-3 border-t border-white/10 flex justify-between items-baseline">
            <span className="text-white font-medium">Total paid</span>
            <span className="font-mono text-[18px] font-medium text-[#F4EFE6] tabular-nums">
              {formatCurrency(confirmedBooking.pricing.total)}
            </span>
          </div>
        </div>

        <p className="text-[12px] text-[#9EB0BC] leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
          Your selected nights have been locked on the live residence calendar. Host arrival
          notes from {property.host.name} are included in your reservation details.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onOpenBookingsDrawer}
            className="w-full py-3 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium hover:bg-white transition-colors"
          >
            View in My Bookings
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('dates');
              setConfirmedBooking(null);
            }}
            className="w-full py-2.5 rounded-lg border border-white/15 text-[13px] text-[#CBD6DE] hover:text-white hover:border-white/30 transition-colors"
          >
            Book Another Stay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D171F]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl">
      {/* Contiguous Header: Nightly rate & rating */}
      <div className="flex items-baseline justify-between gap-4 pb-5 mb-5 border-b border-white/10">
        <div>
          <span className="font-mono text-[24px] font-medium text-white tabular-nums">
            {formatCurrency(property.pricePerNight)}
          </span>
          <span className="text-[13px] text-[#8FA2B0] ml-1.5">/ night</span>
        </div>
        <div className="flex items-center gap-1.5 text-[13px] text-white tabular-nums">
          <Star className="w-3.5 h-3.5 fill-[#E5A952] text-[#E5A952]" aria-hidden="true" />
          <span className="font-medium">{property.rating.toFixed(2)}</span>
          <span className="text-[#8FA2B0]">({property.reviewCount})</span>
        </div>
      </div>

      {/* Step 1: Real-time Date Selection & Pricing */}
      {step === 'dates' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2.5">
            <label className="p-3.5 rounded-lg bg-white/[0.04] border border-white/12 block hover:border-white/25 transition-colors">
              <span className="block text-[11px] text-[#8FA2B0] mb-1">Arrival</span>
              <input
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => {
                  const nextIn = e.target.value;
                  onChangeDates(
                    nextIn,
                    checkOut && nextIn && checkOut <= nextIn ? '' : checkOut
                  );
                }}
                className="w-full bg-transparent font-mono text-[13px] text-white tabular-nums focus:outline-none"
              />
            </label>
            <label className="p-3.5 rounded-lg bg-white/[0.04] border border-white/12 block hover:border-white/25 transition-colors">
              <span className="block text-[11px] text-[#8FA2B0] mb-1">Departure</span>
              <input
                type="date"
                min={checkIn || today}
                value={checkOut}
                onChange={(e) => onChangeDates(checkIn, e.target.value)}
                className="w-full bg-transparent font-mono text-[13px] text-white tabular-nums focus:outline-none"
              />
            </label>
          </div>

          <label className="block rounded-lg bg-white/[0.04] border border-white/12 p-3.5 hover:border-white/25 transition-colors">
            <span className="block text-[11px] text-[#8FA2B0] mb-1">
              Guests (max {property.maxGuests})
            </span>
            <select
              value={guests}
              onChange={(e) => onChangeGuests(Number(e.target.value))}
              className="w-full bg-transparent text-[14px] font-medium text-white focus:outline-none"
            >
              {Array.from({ length: property.maxGuests }, (_, idx) => idx + 1).map((n) => (
                <option key={n} value={n} className="bg-[#0D171F] text-white">
                  {n} {n === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </label>

          {/* Real-time Availability Feedback */}
          {checking && (
            <div className="flex items-center gap-2 text-[13px] text-[#9EB0BC] py-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#F4EFE6]" aria-hidden="true" />
              <span>Verifying live residence availability...</span>
            </div>
          )}

          {checkError && (
            <div className="p-3.5 rounded-lg bg-red-500/15 border border-red-400/30 flex items-start gap-2.5 text-[13px] text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{checkError}</span>
            </div>
          )}

          {!checking && availability && !availability.available && (
            <div className="p-3.5 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-start gap-2.5 text-[13px] text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{availability.reason}</span>
            </div>
          )}

          {!checking && availability?.available && availability.pricing && (
            <div className="space-y-2.5 pt-2 text-[13px]">
              <div className="flex items-center justify-between text-emerald-300 font-medium pb-2">
                <span>Available for instant confirmation</span>
                <span className="font-mono tabular-nums">
                  {availability.pricing.nights}{' '}
                  {availability.pricing.nights === 1 ? 'night' : 'nights'}
                </span>
              </div>

              <div className="flex justify-between text-[#9EB0BC]">
                <span className="tabular-nums">
                  {formatCurrency(availability.pricing.nightlyRate)} ×{' '}
                  {availability.pricing.nights} nights
                </span>
                <span className="font-mono text-white tabular-nums">
                  {formatCurrency(availability.pricing.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#9EB0BC]">
                <span>House preparation & linen fee</span>
                <span className="font-mono text-white tabular-nums">
                  {formatCurrency(availability.pricing.cleaningFee)}
                </span>
              </div>
              <div className="flex justify-between text-[#9EB0BC]">
                <span>Solenne stewardship fee</span>
                <span className="font-mono text-white tabular-nums">
                  {formatCurrency(availability.pricing.serviceFee)}
                </span>
              </div>
              <div className="flex justify-between text-[#9EB0BC]">
                <span>Local occupancy taxes</span>
                <span className="font-mono text-white tabular-nums">
                  {formatCurrency(availability.pricing.taxes)}
                </span>
              </div>
              <div className="pt-3 mt-2 border-t border-white/10 flex justify-between items-baseline">
                <span className="text-[14px] font-medium text-white">Total</span>
                <span className="font-mono text-[19px] font-medium text-[#F4EFE6] tabular-nums">
                  {formatCurrency(availability.pricing.total)}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={checking || !availability?.available}
            onClick={() => {
              setPaymentError(null);
              setStep('checkout');
            }}
            className="w-full py-3.5 px-4 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[14px] font-medium hover:bg-white disabled:bg-white/10 disabled:text-[#6E8290] disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
          >
            <span>
              {!checkIn || !checkOut
                ? 'Select Arrival & Departure'
                : availability?.available
                  ? 'Reserve Retreat'
                  : 'Choose Open Dates'}
            </span>
            {availability?.available && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          </button>

          <p className="text-[12px] text-[#8FA2B0] text-center">
            Free cancellation up to 48 hours before arrival · No charge until confirmed
          </p>
        </div>
      )}

      {/* Step 2: Guest Details + Encrypted Tokenized Payment Checkout */}
      {step === 'checkout' && availability?.pricing && (
        <form onSubmit={handleCheckoutSubmit} className="space-y-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep('dates')}
              className="inline-flex items-center gap-1.5 text-[13px] text-[#9EB0BC] hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Edit dates
            </button>
            <button
              type="button"
              onClick={fillTestPaymentDetails}
              className="text-[12px] text-[#F4EFE6] hover:underline font-medium"
            >
              Fill test card
            </button>
          </div>

          {/* Stay Summary Strip */}
          <div className="bg-white/[0.04] border border-white/12 rounded-xl p-3.5 flex items-center justify-between text-[13px]">
            <div>
              <p className="font-mono text-white tabular-nums">
                {formatShortDate(checkIn)} — {formatShortDate(checkOut)}
              </p>
              <p className="text-[#8FA2B0] text-[12px] mt-0.5">
                {availability.pricing.nights}{' '}
                {availability.pricing.nights === 1 ? 'night' : 'nights'} · {guests}{' '}
                {guests === 1 ? 'guest' : 'guests'}
              </p>
            </div>
            <span className="font-mono text-[15px] font-medium text-[#F4EFE6] tabular-nums">
              {formatCurrency(availability.pricing.total)}
            </span>
          </div>

          {paymentError && (
            <div className="p-3.5 rounded-lg bg-red-500/15 border border-red-400/30 flex items-start gap-2.5 text-[13px] text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{paymentError}</span>
            </div>
          )}

          {/* Guest Information */}
          <div className="space-y-3">
            <p className="text-[12px] font-medium text-[#E2E9EE]">01. Primary Guest</p>
            <input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Full name"
              aria-label="Primary guest full name"
              className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Email for receipt"
                aria-label="Guest email address"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
              <input
                type="tel"
                required
                minLength={7}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Mobile number"
                aria-label="Guest telephone number"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </div>
            <input
              type="text"
              maxLength={500}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Arrival time or note for the host (optional)"
              aria-label="Special requests"
              className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
            />
          </div>

          {/* Encrypted Payment Card Details */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-[#E2E9EE] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#F4EFE6]" aria-hidden="true" />
                02. Secure Card Payment
              </p>
              {cardBrand && (
                <span className="font-mono text-[11px] text-[#F4EFE6] font-medium">
                  {cardBrand}
                </span>
              )}
            </div>

            <input
              type="text"
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Name on card"
              aria-label="Cardholder name"
              className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
            />

            <div className="relative">
              <CreditCard
                className="w-4 h-4 text-[#8FA2B0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                required
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumberInput(e.target.value))}
                placeholder="1234 5678 9012 3456"
                aria-label="Card number"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg pl-10 pr-3.5 py-2.5 font-mono text-[14px] tabular-nums text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                required
                maxLength={2}
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="MM"
                aria-label="Expiration month"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2.5 font-mono text-[13px] tabular-nums text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                required
                maxLength={2}
                value={expYear}
                onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                placeholder="YY"
                aria-label="Expiration year"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2.5 font-mono text-[13px] tabular-nums text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                required
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="CVC"
                aria-label="Card security code"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2.5 font-mono text-[13px] tabular-nums text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </div>

            <div className="flex items-start gap-2 text-[11px] text-[#95A7B4] leading-relaxed bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <ShieldCheck
                className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Card numbers are validated and exchanged for a single-use payment token. Raw
                card numbers and security codes are never stored in booking records.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full py-3.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[14px] font-medium hover:bg-white disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Authorizing & Confirming...</span>
              </>
            ) : (
              <span>Pay {formatCurrency(availability.pricing.total)} & Confirm Stay</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
