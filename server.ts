import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { SEED_PROPERTIES, SEED_REVIEWS } from './src/data/seedData.ts';
import type {
  Booking,
  DateRange,
  PricingBreakdown,
  Property,
  Review,
  ReviewDimensions,
} from './src/types.ts';

interface PaymentTokenRecord {
  token: string;
  brand: string;
  last4: string;
  cardholderName: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

interface PersistedStore {
  bookings: Booking[];
  reviews: Review[];
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'solenne-store.json');
const SESSION_REGEX = /^[a-zA-Z0-9_-]{12,64}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const paymentTokenVault = new Map<string, PaymentTokenRecord>();

function ensureStore(): PersistedStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedStore>;
      if (Array.isArray(parsed.bookings) && Array.isArray(parsed.reviews)) {
        return {
          bookings: parsed.bookings,
          reviews: parsed.reviews,
        };
      }
    }
  } catch {
    // Fallback to initial seed if file is missing or unreadable
  }
  const initial: PersistedStore = {
    bookings: [],
    reviews: [...SEED_REVIEWS],
  };
  persistStore(initial);
  return initial;
}

function persistStore(store: PersistedStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.error('Failed to persist store:', err);
  }
}

const store: PersistedStore = ensureStore();

function parseIsoDate(dateStr: string): Date | null {
  if (typeof dateStr !== 'string' || !ISO_DATE_REGEX.test(dateStr)) {
    return null;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function calculateNights(checkIn: string, checkOut: string): number {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (!start || !end) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  // Standard hotel/homestay interval overlap: [checkIn, checkOut)
  return aStart < bEnd && bStart < aEnd;
}

function getAllBookedRanges(property: Property): DateRange[] {
  const activeBookingRanges: DateRange[] = store.bookings
    .filter((b) => b.propertyId === property.id && b.status === 'confirmed')
    .map((b) => ({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      reason: 'Confirmed Booking',
    }));
  return [...property.blockedRanges, ...activeBookingRanges];
}

function computePropertyWithLiveRatings(property: Property): Property {
  const propReviews = store.reviews.filter((r) => r.propertyId === property.id);
  if (propReviews.length === 0) {
    return {
      ...property,
      blockedRanges: getAllBookedRanges(property),
    };
  }
  const avg =
    propReviews.reduce((acc, r) => acc + r.rating, 0) / propReviews.length;
  return {
    ...property,
    rating: Number(avg.toFixed(2)),
    reviewCount: propReviews.length,
    blockedRanges: getAllBookedRanges(property),
  };
}

function computeDimensionAverages(reviews: Review[]): ReviewDimensions {
  if (reviews.length === 0) {
    return { cleanliness: 5, location: 5, hospitality: 5, architecture: 5 };
  }
  const sum = reviews.reduce(
    (acc, r) => ({
      cleanliness: acc.cleanliness + r.dimensions.cleanliness,
      location: acc.location + r.dimensions.location,
      hospitality: acc.hospitality + r.dimensions.hospitality,
      architecture: acc.architecture + r.dimensions.architecture,
    }),
    { cleanliness: 0, location: 0, hospitality: 0, architecture: 0 }
  );
  const count = reviews.length;
  return {
    cleanliness: Number((sum.cleanliness / count).toFixed(2)),
    location: Number((sum.location / count).toFixed(2)),
    hospitality: Number((sum.hospitality / count).toFixed(2)),
    architecture: Number((sum.architecture / count).toFixed(2)),
  };
}

function computePricing(property: Property, nights: number): PricingBreakdown {
  const subtotal = property.pricePerNight * nights;
  const cleaningFee = property.cleaningFee;
  const serviceFee = Math.round(subtotal * property.serviceFeeRate);
  const taxes = Math.round((subtotal + cleaningFee) * property.taxRate);
  const total = subtotal + cleaningFee + serviceFee + taxes;
  return {
    nightlyRate: property.pricePerNight,
    nights,
    subtotal,
    cleaningFee,
    serviceFee,
    taxes,
    total,
  };
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (Number.isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

function extractSessionId(req: Request): string | null {
  const header = req.header('x-solenne-session');
  if (typeof header === 'string' && SESSION_REGEX.test(header)) {
    return header;
  }
  return null;
}

function clampRating(val: unknown): number | null {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 1 || num > 5) return null;
  return Number(num.toFixed(1));
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  // Clean expired payment tokens periodically
  setInterval(() => {
    const now = Date.now();
    for (const [token, record] of paymentTokenVault.entries()) {
      if (record.expiresAt < now || record.used) {
        paymentTokenVault.delete(token);
      }
    }
  }, 5 * 60 * 1000).unref();

  // GET /api/properties — filter by location, price, rating, guests, real-time dates, sort
  app.get('/api/properties', (req: Request, res: Response) => {
    const location = typeof req.query.location === 'string' ? req.query.location.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const minRating = Number(req.query.minRating);
    const guests = Number(req.query.guests);
    const checkIn = typeof req.query.checkIn === 'string' ? req.query.checkIn.trim() : '';
    const checkOut = typeof req.query.checkOut === 'string' ? req.query.checkOut.trim() : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort.trim() : 'curated';

    let results = SEED_PROPERTIES.map(computePropertyWithLiveRatings);

    if (location && location !== 'All') {
      const locLower = location.toLowerCase();
      results = results.filter(
        (p) =>
          p.region.toLowerCase() === locLower ||
          p.location.toLowerCase().includes(locLower) ||
          p.country.toLowerCase().includes(locLower)
      );
    }

    if (search) {
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.location.toLowerCase().includes(search) ||
          p.subtitle.toLowerCase().includes(search) ||
          p.editorial.lead.toLowerCase().includes(search)
      );
    }

    if (Number.isFinite(minPrice) && minPrice > 0) {
      results = results.filter((p) => p.pricePerNight >= minPrice);
    }

    if (Number.isFinite(maxPrice) && maxPrice > 0) {
      results = results.filter((p) => p.pricePerNight <= maxPrice);
    }

    if (Number.isFinite(minRating) && minRating > 0) {
      results = results.filter((p) => p.rating >= minRating);
    }

    if (Number.isFinite(guests) && guests > 0) {
      results = results.filter((p) => p.maxGuests >= guests);
    }

    if (checkIn && checkOut) {
      const nights = calculateNights(checkIn, checkOut);
      if (nights > 0) {
        results = results.filter((p) => {
          const conflicts = p.blockedRanges.some((r) =>
            rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
          );
          return !conflicts;
        });
      }
    }

    if (sort === 'price_asc') {
      results.sort((a, b) => a.pricePerNight - b.pricePerNight);
    } else if (sort === 'price_desc') {
      results.sort((a, b) => b.pricePerNight - a.pricePerNight);
    } else if (sort === 'rating_desc') {
      results.sort((a, b) => b.rating - a.rating);
    }

    res.json({
      properties: results,
      totalCatalogCount: SEED_PROPERTIES.length,
      regions: Array.from(new Set(SEED_PROPERTIES.map((p) => p.region))),
    });
  });

  // GET /api/properties/:id — full monograph detail, live booked ranges, and verified reviews
  app.get('/api/properties/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const base = SEED_PROPERTIES.find((p) => p.id === id || p.slug === id);
    if (!base) {
      res.status(404).json({ error: 'Residence not found.' });
      return;
    }

    const property = computePropertyWithLiveRatings(base);
    const reviews = store.reviews
      .filter((r) => r.propertyId === property.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      property,
      reviews,
      dimensionAverages: computeDimensionAverages(reviews),
      bookedRanges: property.blockedRanges,
    });
  });

  // POST /api/availability/check — real-time date conflict check & authoritative price calculation
  app.post('/api/availability/check', (req: Request, res: Response) => {
    const { propertyId, checkIn, checkOut, guests } = req.body ?? {};
    const base = SEED_PROPERTIES.find((p) => p.id === propertyId);
    if (!base) {
      res.status(404).json({ error: 'Residence not found.' });
      return;
    }

    const start = parseIsoDate(checkIn);
    const end = parseIsoDate(checkOut);
    if (!start || !end) {
      res.status(400).json({ error: 'Please select valid check-in and check-out dates.' });
      return;
    }

    const today = todayUtc();
    if (start.getTime() < today.getTime()) {
      res.json({
        available: false,
        reason: 'Check-in date must be today or in the future.',
        conflicts: [],
        pricing: null,
      });
      return;
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights < 1) {
      res.json({
        available: false,
        reason: 'Check-out must be at least one night after check-in.',
        conflicts: [],
        pricing: null,
      });
      return;
    }

    if (nights > 30) {
      res.json({
        available: false,
        reason: 'Online stays are limited to 30 nights. Contact our stewardship team for longer residencies.',
        conflicts: [],
        pricing: null,
      });
      return;
    }

    const guestCount = Number(guests) || 1;
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > base.maxGuests) {
      res.json({
        available: false,
        reason: `This residence accommodates between 1 and ${base.maxGuests} guests.`,
        conflicts: [],
        pricing: null,
      });
      return;
    }

    const bookedRanges = getAllBookedRanges(base);
    const conflicts = bookedRanges.filter((r) =>
      rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
    );

    if (conflicts.length > 0) {
      res.json({
        available: false,
        reason: 'Selected dates overlap an existing reservation. Please choose open dates on the calendar.',
        conflicts,
        pricing: null,
      });
      return;
    }

    res.json({
      available: true,
      conflicts: [],
      pricing: computePricing(base, nights),
    });
  });

  // POST /api/payments/tokenize — PCI-style tokenization boundary; validates card & returns opaque one-time token
  app.post('/api/payments/tokenize', (req: Request, res: Response) => {
    const { cardNumber, expMonth, expYear, cvc, cardholderName } = req.body ?? {};

    if (typeof cardholderName !== 'string' || cardholderName.trim().length < 2 || cardholderName.trim().length > 100) {
      res.status(400).json({ error: 'Please enter the cardholder’s full name.' });
      return;
    }

    const digits = typeof cardNumber === 'string' ? cardNumber.replace(/\D/g, '') : '';
    if (digits.length < 13 || digits.length > 19 || !luhnCheck(digits)) {
      res.status(400).json({ error: 'Please enter a valid payment card number.' });
      return;
    }

    const monthNum = Number(expMonth);
    const yearNum = Number(expYear);
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      res.status(400).json({ error: 'Please enter a valid expiration month (01–12).' });
      return;
    }

    const fullYear = yearNum < 100 ? 2000 + yearNum : yearNum;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (
      !Number.isInteger(fullYear) ||
      fullYear < currentYear ||
      fullYear > currentYear + 20 ||
      (fullYear === currentYear && monthNum < currentMonth)
    ) {
      res.status(400).json({ error: 'This card appears to be expired.' });
      return;
    }

    const cvcDigits = typeof cvc === 'string' ? cvc.replace(/\D/g, '') : '';
    const brand = detectCardBrand(digits);
    const expectedCvcLen = brand === 'American Express' ? 4 : 3;
    if (cvcDigits.length !== expectedCvcLen && (cvcDigits.length < 3 || cvcDigits.length > 4)) {
      res.status(400).json({ error: 'Please enter a valid 3- or 4-digit security code.' });
      return;
    }

    // Issue single-use token; discard raw PAN & CVC immediately without storing or logging
    const token = `tok_sln_${crypto.randomBytes(18).toString('hex')}`;
    const last4 = digits.slice(-4);
    const record: PaymentTokenRecord = {
      token,
      brand,
      last4,
      cardholderName: cardholderName.trim(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000,
      used: false,
    };
    paymentTokenVault.set(token, record);

    res.status(201).json({
      paymentToken: token,
      brand,
      last4,
      expiresInSeconds: 900,
    });
  });

  // POST /api/bookings — atomic real-time reservation + tokenized payment capture
  app.post('/api/bookings', (req: Request, res: Response) => {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: 'Missing valid booking session identifier.' });
      return;
    }

    const {
      propertyId,
      checkIn,
      checkOut,
      guests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      paymentToken,
    } = req.body ?? {};

    const base = SEED_PROPERTIES.find((p) => p.id === propertyId);
    if (!base) {
      res.status(404).json({ error: 'Residence not found.' });
      return;
    }

    if (typeof guestName !== 'string' || guestName.trim().length < 2 || guestName.trim().length > 100) {
      res.status(400).json({ error: 'Please enter the primary guest’s full name.' });
      return;
    }

    if (typeof guestEmail !== 'string' || !EMAIL_REGEX.test(guestEmail.trim()) || guestEmail.length > 120) {
      res.status(400).json({ error: 'Please enter a valid email address for your receipt.' });
      return;
    }

    const cleanPhone = typeof guestPhone === 'string' ? guestPhone.trim() : '';
    if (cleanPhone.length < 7 || cleanPhone.length > 30) {
      res.status(400).json({ error: 'Please enter a contact telephone number.' });
      return;
    }

    const start = parseIsoDate(checkIn);
    const end = parseIsoDate(checkOut);
    if (!start || !end) {
      res.status(400).json({ error: 'Invalid check-in or check-out date.' });
      return;
    }

    if (start.getTime() < todayUtc().getTime()) {
      res.status(400).json({ error: 'Check-in date must be today or later.' });
      return;
    }

    const nights = calculateNights(checkIn, checkOut);
    if (nights < 1 || nights > 30) {
      res.status(400).json({ error: 'Stay duration must be between 1 and 30 nights.' });
      return;
    }

    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > base.maxGuests) {
      res.status(400).json({ error: `Guest count must be between 1 and ${base.maxGuests}.` });
      return;
    }

    // Verify payment token from vault
    if (typeof paymentToken !== 'string') {
      res.status(400).json({ error: 'A valid payment authorization token is required.' });
      return;
    }

    const tokenRecord = paymentTokenVault.get(paymentToken);
    if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < Date.now()) {
      res.status(402).json({
        error: 'Payment authorization expired or already used. Please re-enter your card details.',
      });
      return;
    }

    // Atomic availability re-check to prevent double bookings
    const bookedRanges = getAllBookedRanges(base);
    const hasConflict = bookedRanges.some((r) =>
      rangesOverlap(checkIn, checkOut, r.checkIn, r.checkOut)
    );
    if (hasConflict) {
      res.status(409).json({
        error: 'Those dates were just reserved. Please select different open dates.',
      });
      return;
    }

    // Consume payment token & calculate authoritative server pricing
    tokenRecord.used = true;
    const pricing = computePricing(base, nights);
    const confirmationCode = `SLN-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    const nowIso = new Date().toISOString();
    const booking: Booking = {
      id: `bk_${crypto.randomBytes(8).toString('hex')}`,
      confirmationCode,
      sessionId,
      propertyId: base.id,
      propertyTitle: base.title,
      propertyLocation: base.location,
      propertyImage: base.imageUrl,
      checkIn,
      checkOut,
      nights,
      guests: guestCount,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestPhone: cleanPhone,
      specialRequests:
        typeof specialRequests === 'string' ? specialRequests.trim().slice(0, 500) : '',
      pricing,
      payment: {
        brand: tokenRecord.brand,
        last4: tokenRecord.last4,
        tokenRef: `ch_${crypto.randomBytes(6).toString('hex')}`,
        status: 'captured',
        paidAt: nowIso,
      },
      status: 'confirmed',
      createdAt: nowIso,
    };

    store.bookings.unshift(booking);
    persistStore(store);

    res.status(201).json({ booking });
  });

  // GET /api/bookings — returns bookings belonging to the caller's session
  app.get('/api/bookings', (req: Request, res: Response) => {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      res.json({ bookings: [] });
      return;
    }
    const sessionBookings = store.bookings
      .filter((b) => b.sessionId === sessionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ bookings: sessionBookings });
  });

  // DELETE /api/bookings/:id — cancels a booking owned by the caller's session & frees dates immediately
  app.delete('/api/bookings/:id', (req: Request, res: Response) => {
    const sessionId = extractSessionId(req);
    if (!sessionId) {
      res.status(401).json({ error: 'Valid booking session required.' });
      return;
    }

    const booking = store.bookings.find(
      (b) => b.id === req.params.id && b.sessionId === sessionId
    );
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (booking.status === 'cancelled') {
      res.json({ booking });
      return;
    }

    booking.status = 'cancelled';
    booking.payment.status = 'refunded';
    persistStore(store);

    res.json({ booking });
  });

  // POST /api/properties/:id/reviews — submit verified guest review & update live average rating
  app.post('/api/properties/:id/reviews', (req: Request, res: Response) => {
    const base = SEED_PROPERTIES.find((p) => p.id === req.params.id);
    if (!base) {
      res.status(404).json({ error: 'Residence not found.' });
      return;
    }

    const { authorName, authorLocation, stayDate, dimensions, comment } = req.body ?? {};
    if (typeof authorName !== 'string' || authorName.trim().length < 2 || authorName.trim().length > 80) {
      res.status(400).json({ error: 'Please provide your name (2–80 characters).' });
      return;
    }

    const cleanLocation =
      typeof authorLocation === 'string' && authorLocation.trim().length > 0
        ? authorLocation.trim().slice(0, 80)
        : 'Verified Guest';

    const cleanStayDate =
      typeof stayDate === 'string' && stayDate.trim().length > 0
        ? stayDate.trim().slice(0, 40)
        : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());

    if (typeof comment !== 'string' || comment.trim().length < 15 || comment.trim().length > 1500) {
      res.status(400).json({ error: 'Please write a reflection between 15 and 1,500 characters.' });
      return;
    }

    const cleanliness = clampRating(dimensions?.cleanliness);
    const locationScore = clampRating(dimensions?.location);
    const hospitality = clampRating(dimensions?.hospitality);
    const architecture = clampRating(dimensions?.architecture);

    if (
      cleanliness === null ||
      locationScore === null ||
      hospitality === null ||
      architecture === null
    ) {
      res.status(400).json({ error: 'All four rating dimensions must be between 1 and 5.' });
      return;
    }

    const overall = Number(
      ((cleanliness + locationScore + hospitality + architecture) / 4).toFixed(2)
    );

    const newReview: Review = {
      id: `rev_${crypto.randomBytes(6).toString('hex')}`,
      propertyId: base.id,
      authorName: authorName.trim(),
      authorLocation: cleanLocation,
      stayDate: cleanStayDate,
      createdAt: new Date().toISOString(),
      rating: overall,
      dimensions: {
        cleanliness,
        location: locationScore,
        hospitality,
        architecture,
      },
      comment: comment.trim(),
      verifiedStay: true,
    };

    store.reviews.unshift(newReview);
    persistStore(store);

    const updatedProperty = computePropertyWithLiveRatings(base);
    const allReviews = store.reviews
      .filter((r) => r.propertyId === base.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.status(201).json({
      review: newReview,
      property: updatedProperty,
      reviews: allReviews,
      dimensionAverages: computeDimensionAverages(allReviews),
    });
  });

  // GET /api/reviews/featured — recent highlighted reviews across all residences for editorial social proof
  app.get('/api/reviews/featured', (_req: Request, res: Response) => {
    const featured = store.reviews
      .slice()
      .sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((rev) => {
        const prop = SEED_PROPERTIES.find((p) => p.id === rev.propertyId);
        return {
          ...rev,
          propertyTitle: prop?.title ?? 'Solenne Residence',
          propertyLocation: prop?.location ?? '',
        };
      });
    res.json({ reviews: featured });
  });

  // Mount Vite middleware in development, or serve static dist in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solenne server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
