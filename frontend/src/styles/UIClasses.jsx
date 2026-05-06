// Card
export const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

// Button classes
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-primary bg-primary-dark px-4 py-2.5 text-sm font-semibold text-neutral-light shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-primary bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const tertiaryButtonClass =
  "inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-600 shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const deleteButtonClass = 
  "inline-flex items-center justify-center rounded-full border border-red-700 bg-slate-10 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200"

export const actionButtonClass =
  "rounded-xl border border-primary-medium bg-primary-light px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"

// Form element classes
export const inputClass =
  "w-full border border-neutral-medium px-4 py-3 rounded-xl text-sm text-neutral-dark focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary";

export const textareaClass =
  "w-full rounded-2xl border border-neutral-medium px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition min-h-[140px]";

export const selectClass =
  "w-full rounded-xl border border-neutral-medium px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition bg-white";

// Chat related classes
export const chatBubbleClass =
  "rounded-2xl border border-neutral px-3 py-1 text-sm leading-tight shadow-sm cursor-default";

export const chatInputClass =
  "w-full rounded-lg border border-neutral px-4 py-2 text-base text-neutral-dark shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition min-h-[72px]";

export const chatButtonClass = (isDisabled) =>
  isDisabled
    ? "inline-flex items-center justify-center rounded-full bg-slate-600 px-4 py-3 text-white font-semibold shadow-lg opacity-60 cursor-not-allowed"
    : "inline-flex items-center justify-center rounded-full px-4 py-3 bg-primary-dark font-semibold text-white shadow-lg hover:scale-105 transition";