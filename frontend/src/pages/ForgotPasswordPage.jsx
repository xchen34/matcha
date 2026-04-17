import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
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
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(`Error: ${data.error || "Failed to send reset email"}`);
        return;
      }

      setMessage(data.message || "Password reset email sent.");
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
        <p className="text-gray-600 mb-6">
          Enter your account email and we will send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-rose-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
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

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-rose-500 hover:text-rose-600 font-semibold">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
