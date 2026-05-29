import { inputClass } from "@/styles/UIClasses.jsx";

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  className = "",
  wrapperClassName = "",
  disabled = false,
}) {
  return (
    <div className={`space-y-1 w-full ${wrapperClassName}`}>
      {label && (
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          {label}
        </label>
      )}

      <div className="relative w-full">
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${inputClass} appearance-none pr-10 bg-white ${className}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          ▾
        </div>
      </div>
    </div>
  );
}

export default SelectField;
