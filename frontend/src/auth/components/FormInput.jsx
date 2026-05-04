import { inputClass } from "@/styles/UIClasses.jsx";

export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  description,
  error,
  ...props
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
        {...props}
      />

      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}