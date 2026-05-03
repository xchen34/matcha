export function SelectField({ label, icon, name, value, onChange, options }) {
  return (
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          ▾
        </div>
      </div>
  );
}