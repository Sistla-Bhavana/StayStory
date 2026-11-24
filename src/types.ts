export interface DateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  reason?: string;
}

export interface HostProfile {
  name: string;
  role: string;
  bio: string;
  yearsHosting: number;
  responseTime: string;
  languages: string[];
}

export interface EditorialNarrative {
  chapterNumber: string;
  lead: string;
  pullQuote: string;
  paragraphs: string[];
  lightNote: string;
  materialsNote: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  location: string;
  city: string;
  country: string;
  region: string;
  pricePerNight: number;
  cleaningFee: number;
  serviceFeeRate: number;
  taxRate: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  architect: string;
  yearBuilt: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  imageCaption: string;
  editorial: EditorialNarrative;
  host: HostProfile;
  amenities: string[];
  houseRules: string[];
  blockedRanges: DateRange[];
}

export interface ReviewDimensions {
  cleanliness: number;
  location: number;
  hospitality: number;
  architecture: number;
}

export interface Review {
  id: string;
  propertyId: string;
  authorName: string;
  authorLocation: string;
  stayDate: string;
  createdAt: string;
  rating: number;
  dimensions: ReviewDimensions;
  comment: string;
  verifiedStay: boolean;
}

export interface PricingBreakdown {
  nightlyRate: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export interface PaymentSummary {
  brand: string;
  last4: string;
  tokenRef: string;
  status: 'captured' | 'refunded';
  paidAt: string;
}

export interface Booking {
  id: string;
  confirmationCode: string;
  sessionId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyImage: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  pricing: PricingBreakdown;
  payment: PaymentSummary;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface AvailabilityResponse {
  available: boolean;
  reason?: string;
  conflicts: DateRange[];
  pricing: PricingBreakdown | null;
}

export interface PropertyDetailResponse {
  property: Property;
  reviews: Review[];
  dimensionAverages: ReviewDimensions;
  bookedRanges: DateRange[];
}

export interface FilterState {
  location: string;
  search: string;
  minPrice: number;
  maxPrice: number;
  minRating: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  sort: 'curated' | 'price_asc' | 'price_desc' | 'rating_desc';
}
