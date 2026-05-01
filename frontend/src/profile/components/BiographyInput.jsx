import { FiInfo } from "react-icons/fi";

export default function BiographyInput({
  form,
  handleChange,
  textareaClass,
  MAX_BIO_LENGTH,
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <FiInfo size={13} aria-hidden="true" />
          <span>Biography</span>
        </span>
      </label>

      <textarea
        name="biography"
        placeholder="Biography"
        value={form.biography}
        onChange={handleChange}
        className={textareaClass}
        rows={4}
        maxLength={MAX_BIO_LENGTH}
      />

      <p className="text-xs text-slate-500 text-right">
        {(form.biography || "").length}/{MAX_BIO_LENGTH}
      </p>
    </div>
  );
}