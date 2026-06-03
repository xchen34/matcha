export function TextField({
  type = "text",
  name,
  value,
  onChange,
  className = "",
  placeholder = "",
  ...rest
}) {
  const baseClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary-dark";

  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      className={`${baseClass} ${className}`}
      placeholder={placeholder}
      {...rest}
    />
  );
}

export default TextField;
