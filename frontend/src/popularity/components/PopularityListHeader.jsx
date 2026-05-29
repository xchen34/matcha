import { Zap, Eye, Heart } from "lucide-react";

function PopularityListHeader({ config, mode, counts }) {
  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {/* TITLE & SUBTITLE */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-neutral-dark flex items-center gap-2">
          {mode === "views" && <Eye size={24} className="text-[#f163cf]" />}
          {mode === "likes" && <Heart size={24} className="text-[#f163cf]" />}
          {mode === "matches" && <Zap size={24} className="text-[#f163cf]" />}
          {config.title}
        </h2>
        <p className="text-sm text-slate-500">{config.subtitle}</p>
      </div>

      {/* COUNTS SUMMARY */}
      <div className="w-full sm:w-auto sm:shrink-0">
        <div className="flex w-full sm:w-auto items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          {/* ICON BASED ON MODE */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-dark text-white shadow-md shadow-primary-light">
            {mode === "views" && <Eye size={18} />}
            {mode === "likes" && <Heart size={18} />}
            {mode === "matches" && <Zap size={18} />}
          </div>
          
          {/* TEXT BASED ON MODE */}
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {mode === "views" && "Total views"}
              {mode === "likes" && "Total likes"}
              {mode === "matches" && "Total matches"}
            </p>
            <p className="text-lg font-bold text-neutral-dark leading-none">
              {counts[mode].length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PopularityListHeader;