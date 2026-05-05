// Card
export const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";

// Button classes
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-primary-dark from-primary to-primary-dark px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:scale-105 hover:shadow-lg transition-all duration-200";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-primary bg-white px-4 py-2.5 text-xs font-semibold text-neutral-dark hover:bg-primary-medium transition-all duration-200";

  // Form element classes
export const inputClass =
  "w-full border border-neutral px-4 py-3 rounded-xl text-sm text-neutral-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

export const textareaClass =
  "w-full rounded-2xl border border-neutral px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition min-h-[140px]";

export const selectClass =
  "w-full rounded-xl border border-neutral px-4 py-3 text-sm text-neutral-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition bg-white";

// Chat related classes
export const chatBubbleClass =
  "rounded-2xl border border-neutral px-3 py-1 text-sm leading-tight shadow-sm cursor-default";

export const chatInputClass =
  "w-full rounded-2xl border border-neutral px-4 py-2 text-base text-neutral-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition min-h-[72px]";

export const chatButtonClass = (isDisabled) =>
  isDisabled
    ? "inline-flex items-center justify-center rounded-full bg-neutral-light px-4 py-3 text-sm font-semibold text-white shadow-lg opacity-60 cursor-not-allowed"
    : "inline-flex items-center justify-center rounded-full bg-primary-light from-primary to-primary-dark px-4 py-3 text-sm font-semibold text-white shadow-lg hover:-translate-y-0.5 transition";