import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormInput from "./components/FormInput";
import { tertiaryButtonClass } from "@/styles/UIClasses";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    
    setIsLoading(true);
    setMessage("");
    setPreviewUrl("");
    setDevResetUrl("");

    try {
      const response = await fetch(
        "/api/auth/forgot-password", 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setMessage(
          `Error: ${
            data.error || 
            "Failed to send reset email"
          }`,
        );
        return;
      }

      setMessage(data.message || "Password reset email sent.");
      
      /* Show email preview link */
      if (data?.email_delivery?.preview_url) {
        setPreviewUrl(data.email_delivery.preview_url);
      }
      
      if (data?.dev_reset_url) {
        setDevResetUrl(data.dev_reset_url);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* ========== HEADER ========== */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Forgot Password
        </h1>
        <p className="text-gray-600 mb-6">
          Enter your account email and we will send a reset link.
        </p>

        {/* ========== FORM  ========== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* EMAIL INPUT  */}
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />

          {/* SUBMIT BUTTON  */}
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
            {isLoading 
              ? "Sending..." 
              : "Send reset link"}
          </button>
        </form>

        {/* ========== MESSAGE  ========== */}
        {message &&<p className="mt-4 text-sm text-slate-700">{message}</p>}

        {/*  ========== PREVIEW URL  ========== */}
        {previewUrl && (
          <p className="mt-2 text-sm text-slate-700">
            Email preview:{" "}
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="text-rose-600 underline"
            >
              Open reset email
            </a>
          </p>
        )}

        {/*  ========== DEV RESET LINK  ========== */}
        {devResetUrl && (
          <p className="mt-2 text-sm text-slate-700">
            Fallback reset link:{" "}
            <a
              href={devResetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-rose-600 underline"
            >
              Reset password directly
            </a>
          </p>
        )}

        {/* ========== BACK TO LOGIN  ========== */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={ tertiaryButtonClass }
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}