import { Mail, PencilLine, Send, X } from "lucide-react";
import { 
  inputClass, 
  primaryButtonClass, 
  secondaryButtonClass 
} from "@/styles/UIClasses.jsx";
import PasswordInput from "@/auth/components/PasswordInput";

export default function EmailChangeForm({
  email,
  emailChangeOpen,
  setEmailChangeOpen,
  emailChangeForm,
  emailChangePreviewUrl,
  emailChangeDevVerifyUrl,
  emailChangeLoading,
  handleEmailChangeInput,
  handleEmailChangeSubmit,
  setEmailChangeForm,
  emailChangeError,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEmailChangeSubmit();
    }
  };

  return (
    <div className="space-y-1">
      {/* Label */}
      <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        <span className="inline-flex items-center gap-1.5">
          <Mail size={13} aria-hidden="true" />
          <span>Email address<span className="text-primary-dark">*</span></span>
        </span>
      </label>

      {/* Current email + modify button */}
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
          <PencilLine size={13} aria-hidden="true" className="mr-1" />
          Modify
        </button>
      </div>

      {/* EMAIL CHANGE FORM */}
      {emailChangeOpen && (
        <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-primary-dark">
            Email can only be changed after password confirmation and new-email verification.
          </p>

          {/* NEW EMAIL INPUT */}
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
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* PASSWORD INPUT */}
          <div className="space-y-1">
            <span className="text-xs tracking-[0.12em] text-slate-500 font-semibold">
              Confirm your current password to authorize the change
            </span>
            <PasswordInput
              name="password"
              placeholder="Current password"
              value={emailChangeForm.password}
              onChange={handleEmailChangeInput}
              className={inputClass}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* ERROR HANDLER */}
          {emailChangeError && (
            <p className="text-sm text-primary-dark font-medium">
              {emailChangeError}
            </p>
          )}

          {/* ACTIONS */}
          <div className="flex gap-2 pt-1">
            {/* Send verification email button */}
            <button
              type="button"
              onClick={handleEmailChangeSubmit}
              className={primaryButtonClass}
              disabled={emailChangeLoading}
            >
              <Send size={13} aria-hidden="true" className="mr-1" />
              {emailChangeLoading ? "Sending..." : "Send verification email"}
            </button>

            {/* Cancel button resets form and closes it */}
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setEmailChangeOpen(false);
                setEmailChangeForm({ new_email: "", password: "" });
              }}
              disabled={emailChangeLoading}
            >
              <X size={13} aria-hidden="true" className="mr-1" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LINK FOR RESET EMAIL */}
      {(emailChangePreviewUrl || emailChangeDevVerifyUrl) && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {emailChangePreviewUrl && (
            <p>
              Email preview:{" "}
              <a
                href={emailChangePreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-dark underline"
              >
                Open verification email
              </a>
            </p>
          )}
          {emailChangeDevVerifyUrl && (
            <p>
              Fallback verify link:{" "}
              <a
                href={emailChangeDevVerifyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary-dark underline"
              >
                Verify directly in app
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}