import { Star } from "lucide-react";

interface ReviewSummaryCardProps {
  avgRating: number;
  totalCount: number;
  distribution: Record<number, number>;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
}

export function ReviewSummaryCard({
  avgRating,
  totalCount,
  distribution,
  selectedRating,
  onSelectRating,
}: ReviewSummaryCardProps) {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-3 md:items-center shadow-xs">
      {/* Big Rating Summary */}
      <div className="flex flex-col items-center justify-center text-center md:border-r md:border-border md:pr-6">
        <div className="font-display text-5xl font-light tracking-tight text-foreground">{avgRating}</div>
        <div className="mt-2 flex items-center space-x-1 text-amber-400">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= Math.round(avgRating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-muted text-muted opacity-40"
              }`}
            />
          ))}
        </div>
        <span className="mt-2 text-xs font-medium text-muted-foreground">
          {totalCount} ulasan dari pembeli
        </span>
      </div>

      {/* Distribution Bars */}
      <div className="col-span-2 space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
          const isSelected = selectedRating === star;

          return (
            <button
              key={star}
              onClick={() => onSelectRating(isSelected ? null : star)}
              className={`group flex w-full items-center text-xs transition cursor-pointer ${
                isSelected ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="w-8 text-left flex items-center gap-1">
                {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              </span>
              <div className="mx-3 flex-1 overflow-hidden rounded-full bg-secondary h-2.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    isSelected ? "bg-amber-400" : "bg-primary/80 group-hover:bg-primary"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-xs text-muted-foreground">
                {count} ({Math.round(pct)}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
