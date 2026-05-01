import { FiMail } from "react-icons/fi";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "../../styles/UIClasses.jsx";

export default function EmailChangeForm({
  email,
  emailChangeOpen,
  setEmailChangeOpen,
  emailChangeForm,
  emailChangeLoading,
  handleEmailChangeInput,
  handleEmailChangeSubmit,
  setEmailChangeForm,
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <FiMail size={13} aria-hidden="true" />
          <span>Email address<span className="text-red-600">*</span></span>
        </span>
      </label>

      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          placeholder="Email address"
          value={email}
          readOnly
          className={`${inputClass} bg-slate-50 text-slate-600`}
        />
        <button
          type="button"
          onClick={() => setEmailChangeOpen((prev) => !prev)}
          className={secondaryButtonClass}
        >
          Modify
        </button>
      </div>

      {/* EMAIL CHANGE FORM */}
      {emailChangeOpen && (
        <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-orange-500">
            Email can only be changed after password confirmation and new-email verification.
          </p>

          <div className="space-y-1">
            <span className="text-xs tracking-[0.12em] text-slate-500 font-semibold">
              Enter the new email address 
            </span>
            <input
              name="new_email"
              type="email"
              placeholder="New email"
              value={emailChangeForm.new_email}
              onChange={handleEmailChangeInput}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <span className="text-xs tracking-[0.12em] text-slate-500 font-semibold">
              Confirm your current password to authorize the change
            </span>
            <input
              name="password"
              type="password"
              placeholder="Current password"
              value={emailChangeForm.password}
              onChange={handleEmailChangeInput}
              className={inputClass}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleEmailChangeSubmit}
              className={primaryButtonClass}
              disabled={emailChangeLoading}
            >
              {emailChangeLoading ? "Sending..." : "Send verification email"}
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setEmailChangeOpen(false);
                setEmailChangeForm({ new_email: "", password: "" });
              }}
              disabled={emailChangeLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}