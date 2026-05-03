export const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

// Button classes
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg transition disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition";

// Form element classes
export const inputClass =
  "w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500";

export const textareaClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[140px]";

export const selectClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition bg-white";

// Chat related classes
export const chatBubbleClass =
  "rounded-2xl border border-slate-200 px-3 py-1 text-sm leading-tight shadow-sm cursor-default";

export const chatInputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-2 text-base text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[72px]";

export const chatButtonClass = (isDisabled) =>
  isDisabled
    ? "inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-3 text-base font-semibold text-white shadow-lg opacity-60 cursor-not-allowed"
    : "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-3 text-base font-semibold text-white shadow-lg shadow-orange-200/60 hover:-translate-y-0.5 transition";
