import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FormInput, EmailPreviewLinks } from "@/utils/components";

export default function ResendVerificationPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  /*========== Initialize email from state or query params ========== */
  const initialEmailFromState =
    typeof location.state
      ?.prefillEmail === "string"
      ? location.state.prefillEmail.trim().toLowerCase()
      : "";
  const initialEmailFromQuery = (
    searchParams.get("email") || ""
  ).trim().toLowerCase();

  /*========== Form state ========== */
  const [email, setEmail] = useState(
    initialEmailFromState || initialEmailFromQuery
  );

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  
  /*========== Email preview URLs ========== */
  const [previewUrl, setPreviewUrl] = useState(
    location.state?.previewUrl || ""
  );
  const [devVerifyUrl, setDevVerifyUrl] = useState(
    location.state?.devVerifyUrl || ""
  );

  /*========== Handle form submission ========== */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setStatus(null);
    setMessage("");
    setPreviewUrl("");
    setDevVerifyUrl("");

    try {
      const response = await fetch(
        "/api/auth/resend-verification-email", 
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        
        if (data?.email_delivery?.preview_url) {
          setPreviewUrl(data.email_delivery.preview_url);
        }
        
        if (data?.dev_verify_url) {
          setDevVerifyUrl(data.dev_verify_url);
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to resend verification email",);
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred. Please try again later.");
      console.error("Resend error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/*  ========== HEADER ========== */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Resend verification email</h1>
        <p className="text-gray-600 mb-6">
          Enter your email address and we'll send you a new verification link.
        </p>

        {/*  ========== FORM ========== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL INPUT */}
          <FormInput
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
          />

          {/* STATUS MESSAGES */}
          {status === 'success' && (
            <div className="bg-green-50 border border-valid rounded-lg p-4">
              <p className="text-green-800 text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-error rounded-lg p-4">
              <p className="text-red-800 text-sm">{message}</p>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="
              w-full bg-primary text-primary-light 
              border border-primary-dark font-semibold 
              py-2 px-4 rounded-lg 
              hover:bg-primary-dark hover:scale-105 transition 
              disabled:bg-gray-400 disabled:text-white 
              disabled:border-none disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Resend verification email"}
          </button>
        </form>
        
        <EmailPreviewLinks previewUrl={previewUrl} devVerifyUrl={devVerifyUrl} className="mt-4" />

        {/*  ========== BACK TO LOGIN / REGISTER LINKS ========== */}
        <div className="mt-6 text-center space-y-3 text-sm text-gray-600">
          <p>
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-semibold">
              Go to Login
            </Link>
          </p>

          <p>
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:text-primary/80 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}