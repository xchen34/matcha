import { User, Compass } from "lucide-react";

export default function GenderSelector({
  form,
  handleChange,
  selectClass,
}) {
  return (
    <>
      {/* GENDER */}
      <div className="space-y-1">
        {/* Label */}
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <User size={13} aria-hidden="true" />
            <span>
              Gender<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>

        {/* Select input */}
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className={selectClass}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non_binary">Non-binary</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* SEXUAL PREFERENCE */}
      <div className="space-y-1">
        {/* Label */}
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Compass size={13} aria-hidden="true" />
            <span>Sexual preference</span>
          </span>
        </label>

        {/* Select input */}
        <select
          name="sexual_preference"
          value={form.sexual_preference}
          onChange={handleChange}
          className={selectClass}
        >
          <option value="">Select sexual preference</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="both">Both</option>
          <option value="other">Other</option>
        </select>
      </div>
    </>
  );
}