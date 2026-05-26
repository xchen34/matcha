import { inputClass } from "@/styles/UIClasses.jsx";

//FormInput is a reusable component for form inputs
//it is used in the login, register, forgot-password, and reset-password pages
//why use it this way because we can reduce the code duplication and make the code more maintainable
//it can also be used in the profile page for editing the user profile
export default function FormInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  description,
  error,
  ...props  //this line allows any other props to be passed to the input element, and it will be spread to the input element
}) {
  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        {label}
      </label>

      {/* Input */}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
        {...props}
      />

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}