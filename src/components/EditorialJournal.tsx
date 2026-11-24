import { ArrowUpRight, Star } from 'lucide-react';
import type { FeaturedReview } from '../lib/api.ts';
import type { Property } from '../types.ts';

interface EditorialJournalProps {
  properties: Property[];
  featuredReviews: FeaturedReview[];
  onSelectPropertyById: (propertyId: string) => void;
}

const CHAPTERS = [
  {
    number: '01',
    title: 'Architecture as Quiet Stewardship',
    excerpt:
      'Every residence in our anthology is restored or built with regional craftspeople—from Fushimi clay plaster in Kyoto to untreated Swiss Valais larch.',
    detail: '100% owner-stewarded private homes',
  },
  {
    number: '02',
    title: 'Real-Time Transparency at Every Step',
    excerpt:
      'Calendars synchronize immediately upon reservation, pricing is itemized down to local occupancy tax, and tokenized card processing keeps payment details private.',
    detail: 'Zero hidden resort fees · Instant receipts',
  },
  {
    number: '03',
    title: 'Hospitality Measured by Stillness',
    excerpt:
      'Hosts share personal neighborhood monographs—local ceramicists, morning bakeries, and quiet trails—never generic tourist checklists.',
    detail: '4.85 average rating across verified stays',
  },
];

export function EditorialJournal({
  properties,
  featuredReviews,
  onSelectPropertyById,
}: EditorialJournalProps) {
  return (
    <section id="journal" className="border-t border-white/10 bg-[#0B131A]">
      <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-20 lg:py-24">
        {/* Editorial philosophy 3-chapter layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-16 border-b border-white/10">
          <div className="lg:col-span-4">
            <p className="text-[12px] tracking-[0.12em] text-[#8FA2B0] mb-3">
              Editorial Notes
            </p>
            <h2 className="font-sans text-[34px] sm:text-[40px] leading-[1.1] tracking-[-0.02em] font-medium text-white">
              The architecture of
              <span className="block font-normal text-[#A8B8C4]">
                unhurried travel.
              </span>
            </h2>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {CHAPTERS.map((chapter) => (
              <div key={chapter.number} className="flex flex-col justify-between">
                <div>
                  <span className="font-mono text-[12px] text-[#8FA2B0] tabular-nums block mb-3">
                    {chapter.number}.
                  </span>
                  <h3 className="font-editorial text-[26px] leading-[1.2] text-[#F4F6F7] mb-3">
                    {chapter.title}
                  </h3>
                  <p className="text-[14px] leading-[1.68] text-[#9EB0BC] mb-5">
                    {chapter.excerpt}
                  </p>
                </div>
                <p className="text-[12px] text-[#F4EFE6] font-medium pt-3 border-t border-white/10">
                  {chapter.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Claim-to-Proof Adjacent Guest Reflections */}
        <div id="guest-voices" className="pt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-[12px] tracking-[0.12em] text-[#8FA2B0] mb-2">
                Verified Guest Reflections
              </p>
              <h2 className="font-sans text-[32px] sm:text-[38px] leading-[1.1] tracking-[-0.02em] font-medium text-white">
                Notes left in the house books.
              </h2>
            </div>
            <p className="text-[13px] text-[#9EB0BC] max-w-[38ch]">
              Unedited impressions from recent stays. Open any residence monograph to read all
              reviews or publish your own stay reflection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredReviews.map((review) => {
              const matched = properties.find((p) => p.id === review.propertyId);
              return (
                <article
                  key={review.id}
                  className="bg-[#0E1820] border border-white/10 rounded-2xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="flex items-center gap-1.5 font-mono text-[12px] text-white tabular-nums">
                        <Star
                          className="w-3.5 h-3.5 fill-[#E5A952] text-[#E5A952]"
                          aria-hidden="true"
                        />
                        {review.rating.toFixed(1)}
                      </span>
                      <span className="text-[12px] text-[#8FA2B0]">{review.stayDate}</span>
                    </div>

                    <blockquote className="text-[14px] leading-[1.68] text-[#CBD6DE] mb-6">
                      “{review.comment}”
                    </blockquote>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[13px] font-medium text-white">
                      {review.authorName}
                    </p>
                    <p className="text-[12px] text-[#8FA2B0] mb-3">
                      {review.authorLocation}
                    </p>
                    {matched && (
                      <button
                        type="button"
                        onClick={() => onSelectPropertyById(matched.id)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#F4EFE6] hover:underline"
                      >
                        <span>{review.propertyTitle}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
