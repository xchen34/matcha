import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PasswordInput from "./components/PasswordInput";
import FormInput from "./components/FormInput";
import { secondaryButtonClass } from "../styles/UIClasses.jsx";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(
    () => (searchParams.get("token") || "").trim(),
    [searchParams]
  );

  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });

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
      setMessage("Passwords do not match");
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
        setMessage(data.error || "Reset failed");
        return;
      }

      setTimeout(() => navigate("/login"), 1000);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Reset Password
        </h1>

        <p className="text-gray-600 mb-6">
          Set a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* NEW PASSWORD */}
          <FormInput
            label="New Password"
            name="new_password"
            type="password"
            value={form.new_password}
            onChange={handleChange}
            placeholder="New password"
          />

          {/* CONFIRM PASSWORD */}
          <FormInput
            label="Confirm Password"
            name="confirm_password"
            type="password"
            value={form.confirm_password}
            onChange={handleChange}
            placeholder="Confirm password"
          />

          {/* ONLY ONE SIMPLE MESSAGE */}
          {form.confirm_password &&
            form.new_password !== form.confirm_password && (
              <p className="text-xs text-red-500">
                Passwords do not match
              </p>
            )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-rose-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-rose-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-slate-700">{message}</p>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}