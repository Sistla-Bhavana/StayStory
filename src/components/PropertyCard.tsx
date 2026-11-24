import { ArrowUpRight, Star } from 'lucide-react';
import type { Property } from '../types.ts';
import { formatCurrency } from '../lib/dates.ts';
import { SafeImage } from './SafeImage.tsx';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  return (
    <article className="group flex flex-col bg-[#0D171F] border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25">
      <button
        type="button"
        onClick={() => onSelect(property)}
        className="flex flex-col flex-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6]"
      >
        {/* Uniform 4:3 visual lead */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A1218]">
          <SafeImage
            src={property.imageUrl}
            alt={`${property.title} in ${property.location}`}
            title={property.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0D171F]/80 to-transparent"
          />
        </div>

        {/* Clean editorial content */}
        <div className="p-6 flex flex-col flex-1 justify-between">
          <div>
            {/* Zero-pill unboxed metadata */}
            <div className="flex items-center gap-2 text-[12px] text-[#8FA2B0] mb-2.5">
              <span>{property.location}</span>
              <span aria-hidden="true">·</span>
              <span>{property.maxGuests} Guests</span>
              <span aria-hidden="true">·</span>
              <span>
                {property.bedrooms} {property.bedrooms === 1 ? 'Bedroom' : 'Bedrooms'}
              </span>
            </div>

            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-sans text-[21px] leading-[1.2] font-medium tracking-[-0.01em] text-[#F4F6F7] group-hover:text-[#F4EFE6] transition-colors">
                {property.title}
              </h3>
              <ArrowUpRight
                className="w-4 h-4 text-[#8FA2B0] shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#F4EFE6]"
                aria-hidden="true"
              />
            </div>

            <p className="text-[14px] leading-[1.6] text-[#9EB0BC] line-clamp-2 mb-6">
              {property.subtitle}
            </p>
          </div>

          {/* Aligned price & live rating baseline */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[16px] font-medium text-white tabular-nums">
                {formatCurrency(property.pricePerNight)}
              </span>
              <span className="text-[12px] text-[#8FA2B0]">/ night</span>
            </div>

            <div className="flex items-center gap-1.5 text-[13px] text-[#F4F6F7] tabular-nums">
              <Star
                className="w-3.5 h-3.5 fill-[#E5A952] text-[#E5A952]"
                aria-hidden="true"
              />
              <span className="font-medium">{property.rating.toFixed(2)}</span>
              <span className="text-[#8FA2B0]">({property.reviewCount})</span>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
