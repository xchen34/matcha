import { FiUsers } from "react-icons/fi";
import { Flame } from "lucide-react";

function FindMatchHeader({ fameRating, canLikeProfiles }) {
  return (
    <div className="flex flex-col gap-1 mb-12">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {!canLikeProfiles && (
            <p className="text-[11px] text-amber-700 leading-snug max-w-md">
              Add a primary profile photo in your profile to enable likes.
            </p>
          )}

          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-neutral-dark">
            <FiUsers size={24} className="text-[#f163cf]" aria-hidden="true" />
            <span>Find my match</span>
          </h2>

          <p className="text-sm text-slate-500">
            Suggested results are ranked intelligently by compatibility,
            proximity, shared tags, and fame rating.
          </p>
        </div>

        <div className="shrink-0">
          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-dark text-white shadow-md shadow-primary-dark">
              <Flame />
            </div>

            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                My fame
              </p>

              <p className="text-lg font-bold text-neutral-dark leading-none">
                {fameRating}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindMatchHeader;