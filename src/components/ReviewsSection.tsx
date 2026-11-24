import { useState } from 'react';
import { Check, PenLine, Star } from 'lucide-react';
import type { Property, Review, ReviewDimensions } from '../types.ts';
import { submitReview } from '../lib/api.ts';

interface ReviewsSectionProps {
  property: Property;
  reviews: Review[];
  dimensionAverages: ReviewDimensions;
  onReviewSubmitted: (payload: {
    property: Property;
    reviews: Review[];
    dimensionAverages: ReviewDimensions;
  }) => void;
}

const DIMENSION_LABELS: Array<{ key: keyof ReviewDimensions; label: string }> = [
  { key: 'architecture', label: 'Architecture & Design' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'location', label: 'Setting & Location' },
  { key: 'hospitality', label: 'Host Hospitality' },
];

export function ReviewsSection({
  property,
  reviews,
  dimensionAverages,
  onReviewSubmitted,
}: ReviewsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorLocation, setAuthorLocation] = useState('');
  const [stayDate, setStayDate] = useState('November 2026');
  const [dimensions, setDimensions] = useState<ReviewDimensions>({
    architecture: 5,
    cleanliness: 5,
    location: 5,
    hospitality: 5,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await submitReview(property.id, {
        authorName,
        authorLocation,
        stayDate,
        dimensions,
        comment,
      });
      onReviewSubmitted({
        property: result.property,
        reviews: result.reviews,
        dimensionAverages: result.dimensionAverages,
      });
      setAuthorName('');
      setAuthorLocation('');
      setComment('');
      setDimensions({ architecture: 5, cleanliness: 5, location: 5, hospitality: 5 });
      setShowForm(false);
      setJustSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish your review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="pt-10 border-t border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[12px] tracking-[0.1em] text-[#8FA2B0] mb-1.5">Guest Book</p>
          <div className="flex items-baseline gap-3">
            <h3 className="font-editorial text-[34px] text-white leading-none">
              Verified Reviews
            </h3>
            <span className="inline-flex items-center gap-1.5 font-mono text-[14px] text-white tabular-nums">
              <Star className="w-4 h-4 fill-[#E5A952] text-[#E5A952]" aria-hidden="true" />
              {property.rating.toFixed(2)}
              <span className="text-[#8FA2B0] font-sans text-[13px]">
                · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev);
            setJustSubmitted(false);
            setError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-[13px] font-medium text-[#F4EFE6] hover:bg-[#F4EFE6] hover:text-[#0E171D] transition-colors whitespace-nowrap shrink-0"
        >
          <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{showForm ? 'Cancel Review' : 'Write a Review'}</span>
        </button>
      </div>

      {/* 4-Dimension rating breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 pb-8 mb-8 border-b border-white/10">
        {DIMENSION_LABELS.map(({ key, label }) => {
          const val = dimensionAverages[key];
          const pct = Math.min(100, Math.max(0, (val / 5) * 100));
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#9EB0BC]">{label}</span>
                <span className="font-mono text-white font-medium tabular-nums">
                  {val.toFixed(2)}
                </span>
              </div>
              <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F4EFE6] transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {justSubmitted && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/12 border border-emerald-400/25 flex items-center gap-2.5 text-[13px] text-emerald-200">
          <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Thank you. Your reflection has been added to the house book and the residence
            rating has been updated.
          </span>
        </div>
      )}

      {/* Interactive Review Composer */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 bg-[#0D171F] border border-white/15 rounded-2xl p-6 space-y-5"
        >
          <div>
            <h4 className="font-editorial text-[26px] text-white">
              Share your stay at {property.title}
            </h4>
            <p className="text-[13px] text-[#8FA2B0] mt-0.5">
              Rate each dimension and leave a concise note for future guests.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-[13px] text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-[12px] text-[#95A7B4] mb-1.5">Your name *</span>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Clara Lind"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </label>
            <label className="block">
              <span className="block text-[12px] text-[#95A7B4] mb-1.5">Home city</span>
              <input
                type="text"
                maxLength={80}
                value={authorLocation}
                onChange={(e) => setAuthorLocation(e.target.value)}
                placeholder="Amsterdam, Netherlands"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </label>
            <label className="block">
              <span className="block text-[12px] text-[#95A7B4] mb-1.5">Month of stay</span>
              <input
                type="text"
                maxLength={40}
                value={stayDate}
                onChange={(e) => setStayDate(e.target.value)}
                placeholder="November 2026"
                className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6]"
              />
            </label>
          </div>

          {/* Interactive 1–5 dimension ratings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {DIMENSION_LABELS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 border border-white/12 rounded-lg px-3.5 py-2.5 bg-white/[0.03]"
              >
                <span className="text-[13px] text-[#DCE5EC]">{label}</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const active = dimensions[key] >= score;
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          setDimensions((prev) => ({ ...prev, [key]: score }))
                        }
                        aria-label={`Rate ${label} ${score} out of 5`}
                        className="p-0.5 focus-visible:outline-2 focus-visible:outline-[#F4EFE6]"
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            active
                              ? 'fill-[#E5A952] text-[#E5A952]'
                              : 'text-[#394A56] hover:text-[#8FA2B0]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <label className="block">
            <span className="block text-[12px] text-[#95A7B4] mb-1.5">
              Your reflection * (minimum 15 characters)
            </span>
            <textarea
              required
              minLength={15}
              maxLength={1500}
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe the light, atmosphere, neighborhood rhythm, and host hospitality..."
              className="w-full bg-white/[0.04] border border-white/12 rounded-lg px-3.5 py-2.5 text-[14px] text-white placeholder:text-[#6E8290] focus:outline-none focus:border-[#F4EFE6] resize-y"
            />
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-[13px] text-[#9EB0BC] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-[#F4EFE6] text-[#0E171D] text-[13px] font-medium hover:bg-white disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Publishing...' : 'Publish Review'}
            </button>
          </div>
        </form>
      )}

      {/* Chronological Guest Reviews */}
      <div className="space-y-6">
        {reviews.map((review) => (
          <article
            key={review.id}
            className="pb-6 border-b border-white/10 last:border-b-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[15px] font-medium text-white">
                  {review.authorName}
                </span>
                <span className="text-[13px] text-[#8FA2B0]">
                  {review.authorLocation}
                </span>
                <span aria-hidden="true" className="text-white/20">
                  ·
                </span>
                <span className="text-[13px] text-[#8FA2B0]">{review.stayDate}</span>
              </div>

              <div className="flex items-center gap-1 font-mono text-[13px] text-white tabular-nums">
                <Star className="w-3.5 h-3.5 fill-[#E5A952] text-[#E5A952]" aria-hidden="true" />
                <span>{review.rating.toFixed(1)}</span>
              </div>
            </div>

            <p className="text-[14px] leading-[1.7] text-[#CBD6DE] max-w-[68ch]">
              {review.comment}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
