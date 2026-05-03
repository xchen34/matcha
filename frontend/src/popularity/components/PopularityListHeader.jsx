import { FaEye, FaHeart } from "react-icons/fa";

function PopularityListHeader({ config, mode, counts }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          {mode === "views" && <FaEye size={22} />}
          {mode === "likes" && <FaHeart size={20} />}
          {mode === "matches" && (
            <span className="relative inline-flex h-6 w-8 items-center justify-center">
              <FaHeart className="absolute left-0" size={18} />
              <FaHeart className="absolute right-0" size={18} />
            </span>
          )}
          {config.title}
        </h2>
        <p className="text-sm text-slate-500">{config.subtitle}</p>
      </div>

      <div className="w-full sm:w-auto sm:shrink-0">
        <div className="flex w-full sm:w-auto items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-brand-deep text-white shadow-md shadow-orange-200/60">
            {mode === "views" && <FaEye size={14} />}
            {mode === "likes" && <FaHeart size={14} />}
            {mode === "matches" && <FaHeart size={14} />}
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {mode === "views" && "Total views"}
              {mode === "likes" && "Total likes"}
              {mode === "matches" && "Total matches"}
            </p>
            <p className="text-lg font-bold text-slate-900 leading-none">
              {counts[mode].length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PopularityListHeader;