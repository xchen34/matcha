// Card
export const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

// Button classes
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary-dark px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-primary bg-white px-4 py-2.5 text-xs font-semibold text-primary-dark hover:bg-primary-medium hover:text-white transition-all duration-200";

export const tertiaryButtonClass =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-600 shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const deleteButtonClass = 
  "inline-flex items-center justify-center rounded-full border border-red-700 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-700 hover:scale-105 hover:shadow-lg transition-all duration-200";

export const actionButtonClass =
  "rounded-xl border border-primary-medium bg-primary-light px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"

// Form element classes
export const inputClass =
  "w-full border border-slate-400 px-4 py-2 rounded-xl text-sm text-neutral-dark focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";

export const textareaClass =
  "w-full rounded-2xl border border-slate-400 px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition min-h-[140px]";

export const selectClass =
  "w-full rounded-xl border border-slate-400 px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition bg-white";

// Preview box for email preview / dev-verify links
export const previewBoxClass =
  "space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700";

// Chat related classes
export const chatBubbleClass =
  "rounded-2xl border border-slate-400 px-3 py-1 text-sm leading-tight shadow-sm cursor-default";

export const chatInputClass =
  "w-full rounded-lg border border-slate-400 px-4 py-2 text-base text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition min-h-[72px]";

export const chatButtonClass = (isDisabled) =>
  isDisabled
    ? "inline-flex items-center justify-center rounded-full bg-neutral px-4 py-3 text-sm font-semibold text-white shadow-lg opacity-60 cursor-not-allowed"
    : "inline-flex items-center justify-center rounded-full bg-primary from-primary to-primary-dark px-4 py-3 text-sm font-semibold text-white shadow-lg hover:-translate-y-0.5 transition";

export const notificationBadgeClass =
  "pointer-events-none absolute -top-1 -right-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 text-[0.7rem] font-bold uppercase tracking-wide text-white";
