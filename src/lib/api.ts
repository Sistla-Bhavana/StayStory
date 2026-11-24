import type {
  AvailabilityResponse,
  Booking,
  FilterState,
  Property,
  PropertyDetailResponse,
  Review,
  ReviewDimensions,
} from '../types.ts';

// Keep guest booking session identifier strictly in memory (never in localStorage)
let inMemorySessionId: string | null = null;

function getSessionId(): string {
  if (!inMemorySessionId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      inMemorySessionId = `sln_${crypto.randomUUID().replace(/-/g, '')}`;
    } else {
      inMemorySessionId = `sln_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    }
  }
  return inMemorySessionId;
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'An unexpected error occurred. Please try again.';
    throw new Error(message);
  }
  return data as T;
}

export async function fetchProperties(filters: FilterState): Promise<{
  properties: Property[];
  totalCatalogCount: number;
  regions: string[];
}> {
  const params = new URLSearchParams();
  if (filters.location && filters.location !== 'All') params.set('location', filters.location);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.minPrice > 0) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice > 0) params.set('maxPrice', String(filters.maxPrice));
  if (filters.minRating > 0) params.set('minRating', String(filters.minRating));
  if (filters.guests > 1) params.set('guests', String(filters.guests));
  if (filters.checkIn && filters.checkOut) {
    params.set('checkIn', filters.checkIn);
    params.set('checkOut', filters.checkOut);
  }
  if (filters.sort) params.set('sort', filters.sort);

  const res = await fetch(`/api/properties?${params.toString()}`);
  return parseJson(res);
}

export async function fetchPropertyDetail(propertyId: string): Promise<PropertyDetailResponse> {
  const res = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`);
  return parseJson(res);
}

export async function checkAvailability(payload: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}): Promise<AvailabilityResponse> {
  const res = await fetch('/api/availability/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function tokenizePaymentCard(payload: {
  cardholderName: string;
  cardNumber: string;
  expMonth: string;
  expYear: string;
  cvc: string;
}): Promise<{
  paymentToken: string;
  brand: string;
  last4: string;
  expiresInSeconds: number;
}> {
  const res = await fetch('/api/payments/tokenize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function createBooking(payload: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  paymentToken: string;
}): Promise<{ booking: Booking }> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-solenne-session': getSessionId(),
    },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function fetchMyBookings(): Promise<{ bookings: Booking[] }> {
  const res = await fetch('/api/bookings', {
    headers: {
      'x-solenne-session': getSessionId(),
    },
  });
  return parseJson(res);
}

export async function cancelBooking(bookingId: string): Promise<{ booking: Booking }> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
    headers: {
      'x-solenne-session': getSessionId(),
    },
  });
  return parseJson(res);
}

export async function submitReview(
  propertyId: string,
  payload: {
    authorName: string;
    authorLocation: string;
    stayDate: string;
    dimensions: ReviewDimensions;
    comment: string;
  }
): Promise<{
  review: Review;
  property: Property;
  reviews: Review[];
  dimensionAverages: ReviewDimensions;
}> {
  const res = await fetch(`/api/properties/${encodeURIComponent(propertyId)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export interface FeaturedReview extends Review {
  propertyTitle: string;
  propertyLocation: string;
}

export async function fetchFeaturedReviews(): Promise<{ reviews: FeaturedReview[] }> {
  const res = await fetch('/api/reviews/featured');
  return parseJson(res);
}
