import { Link, useLocation, useNavigate } from "react-router-dom";
import { primaryButtonClass, tertiaryButtonClass } from "@/styles/UIClasses.jsx"
import { EmailPreviewLinks } from "@/utils/components";
import { Send } from "lucide-react";

export default function VerificationSentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const prefillEmail =
    typeof location.state?.prefillEmail === "string"
      ? location.state.prefillEmail.trim()
      : "";

  /* Email preview URLs (if available) */
  const previewUrl =
    typeof location.state?.previewUrl === "string"
      ? location.state.previewUrl
      : "";
  const devVerifyUrl =
    typeof location.state?.devVerifyUrl === "string"
      ? location.state.devVerifyUrl
      : "";

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full space-y-4">
        {/* ==========HEADER ========== */}
        <h1 className="text-3xl font-bold text-gray-800">Verification email sent</h1>
        <p className="text-gray-600">
          Your account is created. Please verify your email before login.
        </p>

        {prefillEmail && (
          <p className="text-sm text-slate-700">
            Target email: <strong>{prefillEmail}</strong>
          </p>
        )}

        <EmailPreviewLinks previewUrl={previewUrl} devVerifyUrl={devVerifyUrl} />

        {/* ========== RESEND / BACK TO LOGIN LINKS ========== */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              navigate("/resend-verification", {
                state: {
                  prefillEmail,
                  previewUrl,
                  devVerifyUrl,
                  from: "verification-sent",
                },
              })
            }
            className={primaryButtonClass}
          >
            <Send size={16} aria-hidden="true" className="mr-1" />
            Resend verification
          </button>

          <Link 
            to="/login" 
            className={tertiaryButtonClass}
          >
            Go to login
          </Link>
        </div>

      </div>
    </div>
  );
}
