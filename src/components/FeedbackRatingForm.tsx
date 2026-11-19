import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface FeedbackRatingFormProps {
  rating: number;
  onRatingChange: (val: number) => void;
  feedback: string;
  onFeedbackChange: (val: string) => void;
  appreciation: string;
  onAppreciationChange: (val: string) => void;
}

const APPRECIATION_PRESETS = [
  'Thank you for helping our community!',
  'Grateful for your quick and kind support.',
  'Your help made a real difference today.',
];

export function FeedbackRatingForm({
  rating,
  onRatingChange,
  feedback,
  onFeedbackChange,
  appreciation,
  onAppreciationChange,
}: FeedbackRatingFormProps) {
  return (
    <div className="space-y-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Optional Feedback & Rating
        </span>
        <span className="text-xs text-slate-500">You can skip anytime</span>
      </div>

      <div>
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          Five-Star Rating (optional)
        </span>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= rating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onRatingChange(rating === star ? 0 : star)}
                aria-label={`Rate ${star} out of 5 stars`}
                className={cn(
                  'p-2 rounded-xl border transition-colors',
                  active
                    ? 'bg-amber-50 border-amber-300 text-amber-500 dark:bg-amber-950/60 dark:border-amber-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:text-amber-400'
                )}
              >
                <Star size={18} className={active ? 'fill-amber-400 text-amber-500' : ''} />
              </button>
            );
          })}
          {rating > 0 && (
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1 tabular-nums">
              {rating} / 5
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="optional-feedback" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          Short Feedback Message (optional)
        </label>
        <textarea
          id="optional-feedback"
          rows={2}
          maxLength={600}
          value={feedback}
          onChange={(e) => onFeedbackChange(e.target.value)}
          placeholder="How did the assistance go?"
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green/40 resize-none"
        />
      </div>

      <div>
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
          Appreciation Note (optional)
        </span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {APPRECIATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() =>
                onAppreciationChange(appreciation === preset ? '' : preset)
              }
              className={cn(
                'text-xs px-2.5 py-1.5 rounded-lg border transition-colors text-left',
                appreciation === preset
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          type="text"
          maxLength={300}
          value={appreciation}
          onChange={(e) => onAppreciationChange(e.target.value)}
          placeholder="Or write a custom appreciation message..."
          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-green/40"
        />
      </div>
    </div>
  );
}
