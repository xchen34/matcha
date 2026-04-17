import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("Error: Missing reset token.");
      return;
    }

    if (!form.new_password || !form.confirm_password) {
      setMessage("Error: Please fill all fields.");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setMessage("Error: Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: form.new_password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Reset failed"}`);
        return;
      }

      setMessage(data.message || "Password reset successful.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h1>
        <p className="text-gray-600 mb-6">
          Set a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              name="new_password"
              type={showPassword ? "text" : "password"}
              value={form.new_password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              value={form.confirm_password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) => setShowPassword(event.target.checked)}
            />
            Show password
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rose-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-slate-700">{message}</p>}

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="text-rose-500 hover:text-rose-600 font-semibold">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
