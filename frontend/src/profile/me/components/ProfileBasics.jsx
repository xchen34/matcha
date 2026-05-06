import { User, Calendar } from "lucide-react";

export default function ProfileBasics({
  form,
  handleChange,
  inputClass,
  MIN_BIRTH_DATE_ISO,
  maxAdultBirthDateIso,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      
      {/* USERNAME */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              Username<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* BIRTH DATE */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} />
            <span>
              Birth date<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>
        <input
          name="birth_date"
          type="date"
          value={form.birth_date}
          onChange={handleChange}
          className={inputClass}
          min={MIN_BIRTH_DATE_ISO}
          max={maxAdultBirthDateIso}
          required
        />
      </div>

      {/* FIRST NAME */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              First name<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>
        <input
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      {/* LAST NAME */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} />
            <span>
              Last name<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>
        <input
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

    </div>
  );
}