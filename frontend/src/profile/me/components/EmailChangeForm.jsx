import { Mail, PencilLine, Send, X } from "lucide-react";
import { 
  inputClass, 
  primaryButtonClass, 
  secondaryButtonClass 
} from "@/styles/UIClasses.jsx";
import { FormInput, PasswordInput, EmailPreviewLinks } from "@/utils/components";

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
  // Save user input on enter key press
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
          <Mail size={16} aria-hidden="true" />
          <span>Email address</span>
          <span className="text-primary-dark">*</span>
        </span>
      </label>

      {/* Current email + modify button */}
      <div className="flex gap-2">
        <FormInput
          wrapperClassName="flex-1"
          name="email"
          type="email"
          placeholder="Email address"
          value={email}
          readOnly
          className="bg-slate-50 text-slate-600"
        />
        <button
          type="button"
          onClick={() => setEmailChangeOpen((prev) => !prev)}
          className={secondaryButtonClass}
        >
          <PencilLine size={16} aria-hidden="true" className="mr-1" />
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
          <FormInput
            label="Enter the new email address"
            wrapperClassName="space-y-1"
            name="new_email"
            type="email"
            placeholder="New email"
            value={emailChangeForm.new_email}
            onChange={handleEmailChangeInput}
            onKeyDown={handleKeyDown}
            required
          />

          {/* PASSWORD INPUT */}
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Confirm your current password to authorize the change 
              <span className="text-primary-dark">*</span>
            </span>
            <PasswordInput
              label="Confirm your current password to authorize the change"
              name="password"
              placeholder="Current password"
              value={emailChangeForm.password}
              onChange={handleEmailChangeInput}
              className={inputClass}
              onKeyDown={handleKeyDown}
              required
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
      <EmailPreviewLinks
        previewUrl={emailChangePreviewUrl}
        devVerifyUrl={emailChangeDevVerifyUrl}
      />
    </div>
  );
}