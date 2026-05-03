export function FieldLabel({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
      <Icon size={13} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}