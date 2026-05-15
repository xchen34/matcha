import { Flame, Users, ImageIcon } from "lucide-react";

function FindMatchHeader({ fameRating, canLikeProfiles }) {
  return (
    <div className="flex flex-col gap-1 mb-12">
      <div className="flex items-start justify-between gap-4">
        {/* ======== INFO + HEADER ======== */}
        <div className="space-y-1">
          {!canLikeProfiles && (
            <div className="flex items-center rounded-xl text-primary-dark text-center border border-primary/30 bg-primary-light px-2 py-1 shadow-sm gap-2">
              <ImageIcon size={16} />
              <p className="text-sm">
                You must add a primary profile photo to enable likes.
              </p>
            </div>
          )}

          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-neutral-dark">
            <Users size={24} className="text-[#f163cf]" aria-hidden="true" />
            <span>Find my match</span>
          </h2>

          <p className="text-sm text-slate-500">
            Suggested results are ranked intelligently by compatibility,
            proximity, shared tags, and fame rating.
          </p>
        </div>

        {/* ======== MY FAME RATING ======== */}
        <div className="shrink-0">
          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-dark text-white shadow-md shadow-primary-light">
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