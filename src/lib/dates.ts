import type { DateRange } from '../types.ts';

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isDateBlocked(isoDate: string, bookedRanges: DateRange[]): boolean {
  // A night is occupied if checkIn <= isoDate < checkOut
  return bookedRanges.some((r) => isoDate >= r.checkIn && isoDate < r.checkOut);
}

export function rangeHasConflict(
  checkIn: string,
  checkOut: string,
  bookedRanges: DateRange[]
): boolean {
  return bookedRanges.some((r) => checkIn < r.checkOut && r.checkIn < checkOut);
}

export function formatCardNumberInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function detectBrandLabel(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) return '';
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  return 'Card';
}

export function findNextOpenRange(
  bookedRanges: DateRange[],
  desiredNights = 3
): { checkIn: string; checkOut: string } {
  const today = getTodayIso();
  for (let offset = 1; offset <= 60; offset += 1) {
    const start = addDaysIso(today, offset);
    const end = addDaysIso(start, desiredNights);
    if (!rangeHasConflict(start, end, bookedRanges)) {
      return { checkIn: start, checkOut: end };
    }
  }
  return {
    checkIn: addDaysIso(today, 2),
    checkOut: addDaysIso(today, 2 + desiredNights),
  };
}
