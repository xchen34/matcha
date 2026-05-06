import { FiUser, FiCompass } from "react-icons/fi";

export default function GenderSelector({
  form,
  handleChange,
  selectClass,
}) {
  return (
    <>
      {/* GENDER */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <FiUser size={13} aria-hidden="true" />
            <span>
              Gender<span className="text-primary-dark">*</span>
            </span>
          </span>
        </label>

        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          className={selectClass}
        >
          <option value="">Select gender</option>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="non_binary">non_binary</option>
          <option value="other">other</option>
        </select>
      </div>

      {/* SEXUAL PREFERENCE */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <FiCompass size={13} aria-hidden="true" />
            <span>Sexual preference</span>
          </span>
        </label>

        <select
          name="sexual_preference"
          value={form.sexual_preference}
          onChange={handleChange}
          className={selectClass}
        >
          <option value="">Select sexual preference</option>
          <option value="male">male</option>
          <option value="female">female</option>
          <option value="both">both</option>
          <option value="other">other</option>
        </select>
      </div>
    </>
  );
}