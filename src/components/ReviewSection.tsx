"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { useAuthSheet } from "@/components/auth/AuthSheet";
import { Star, MessageCircle } from "lucide-react";
import { checkReviewEligibility, submitReview, type ReviewEligibility } from "@/actions/review";
import { useRouter } from "next/navigation";

type ReviewSectionProps = {
  propertyId: string;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    user: { name: string | null };
  }>;
  reviewStats: {
    average: number;
    count: number;
  };
};

export function ReviewSection({ propertyId, reviews, reviewStats }: ReviewSectionProps) {
  const { data: session } = useSession();
  const { openAuthSheet } = useAuthSheet();
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  
  // Form State
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleWriteReview = async () => {
    if (!session) {
      openAuthSheet(() => handleWriteReview());
      return;
    }

    startTransition(async () => {
      try {
        const res = await checkReviewEligibility(propertyId);
        setEligibility(res);
        if (res.eligible === false && res.reason === "already_reviewed") {
          setError("You have already reviewed this room.");
        } else {
          setError("");
          setShowForm(true);
        }
      } catch {
        setError("Failed to check eligibility. Please try again.");
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        await submitReview(propertyId, rating, comment, code);
        setShowForm(false);
        setRating(0);
        setComment("");
        setCode("");
        // The server action calls revalidatePath, but doing a router.refresh() 
        // ensures the client immediately pulls the fresh HTML.
        router.refresh();
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to submit review.");
      }
    });
  };

  return (
    <section className="space-y-6 pt-6 border-t border-border mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-text-main flex items-center gap-2">
          Reviews
          {reviewStats.count > 0 && (
            <span className="bg-primary-strong/10 text-primary-strong text-sm px-2 py-0.5 rounded-full font-medium">
              ★ {reviewStats.average.toFixed(1)} ({reviewStats.count})
            </span>
          )}
        </h2>
      </div>

      {error && !showForm && (
        <p className="text-red-600 bg-red-50 p-3 rounded text-sm font-medium border border-red-100">{error}</p>
      )}

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-800">Write a Review</h3>
          
          {eligibility?.eligible === false && eligibility?.reason === "none" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Review Code <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. OMNI-2026"
                className="w-full border-slate-300 rounded-lg p-2.5 outline-none focus:border-primary-strong focus:ring-1 focus:ring-primary-strong uppercase"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Ask the owner or warden for the review code to prove you lived here.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Overall Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  className={`p-1 transition-colors ${
                    (hoverRating || rating) >= star ? "text-yellow-400" : "text-slate-300"
                  }`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Your Review (Optional)
            </label>
            <textarea 
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Tell others what you loved or what could be better..."
              className="w-full border-slate-300 rounded-lg p-3 outline-none focus:border-primary-strong focus:ring-1 focus:ring-primary-strong min-h-[100px] resize-y"
            />
          </div>

          {error && <p className="text-red-600 text-sm font-medium">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={isPending || rating === 0}
              className="bg-primary-strong hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isPending ? "Submitting..." : "Submit Review"}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              disabled={isPending}
              className="text-slate-600 hover:text-slate-900 px-4 py-2.5 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800">Have you lived here?</h3>
            <p className="text-sm text-slate-600 mt-1">Help other students by sharing your honest experience.</p>
          </div>
          <button 
            onClick={handleWriteReview}
            disabled={isPending}
            className="shrink-0 bg-white border border-slate-300 hover:border-primary-strong hover:text-primary-strong text-slate-700 px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
          >
            {isPending ? "Checking..." : "Write a review"}
          </button>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {review.user.name || "A Student"}
                    <span className="text-xs font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-green-700" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Verified Resident
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-3.5 h-3.5 ${star <= review.rating ? "fill-current" : "text-slate-200 fill-none"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
              {review.comment && (
                <p className="text-slate-700 text-sm whitespace-pre-wrap mt-2">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800">No reviews yet</h3>
          <p className="text-sm text-slate-500 mt-1">Be the first to review this property.</p>
        </div>
      )}
    </section>
  );
}
