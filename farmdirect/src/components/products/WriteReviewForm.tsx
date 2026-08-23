import { useState } from "react";
import Icon from "../ui/Icon";
import Button from "../ui/Button";
import { Textarea } from "../ui/Input";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/apiClient";
import { cn } from "../../utils/cn";

export default function WriteReviewForm({
  onSubmit,
  onSubmitted,
}: {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onSubmitted?: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user || user.role !== "customer") return null;
  if (done) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-primary-container/10 text-label-md text-primary font-semibold">
        <Icon name="check_circle" size={18} />
        Thanks for your review!
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
          await onSubmit(rating, comment);
          setDone(true);
          onSubmitted?.();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Couldn't submit your review. Please try again.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="p-4 rounded-lg border border-surface-variant bg-surface-bright space-y-3"
    >
      <p className="text-label-md font-semibold text-on-surface">Write a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-0.5"
          >
            <Icon
              name="star"
              filled={n <= rating}
              size={22}
              className={cn(n <= rating ? "text-tertiary-fixed-dim" : "text-outline-variant")}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={2}
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      {error && <p className="text-label-sm text-error">{error}</p>}
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
