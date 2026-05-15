import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PasswordInput from "./components/PasswordInput";
import { tertiaryButtonClass } from "@/styles/UIClasses.jsx";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* Reset token */
  const token = useMemo(
    () => (searchParams.get("token") || "").trim(),
    [searchParams]
  );

  /* Form state */
  const [form, setForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* Handle input changes */
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ 
      ...prev, 
      [name]: value,
    }));
  }

  /* Handle form submission */
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
      const response = await fetch("/api/auth/reset-password", 
        {
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
    <div className="flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {/* ========== HEADER ========== */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Reset Password
        </h1>

        <p className="text-gray-600 mb-6">
          Set a new password for your account.
        </p>

        {/* ========== FORM ========== */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* NEW PASSWORD */}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              New password
            </label>

            <PasswordInput
              name="new_password"
              value={form.new_password}
              onChange={handleChange}
              placeholder="New password"
              className="w-full rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary px-3 py-2"
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Reenter password
            </label>

            <PasswordInput
              name="confirm_password"
              value={form.confirm_password}
              onChange={handleChange}
              placeholder="Reenter password"
              className="w-full rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary px-3 py-2"
            />
          </div>

          {/* INLINE VALIDATION */}
          {form.confirm_password &&
            form.new_password !== form.confirm_password && (
              <p className="text-xs text-red-500">
                Passwords do not match
              </p>
            )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-light border border-primary-dark font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark hover:scale-105 transition disabled:bg-gray-400 disabled:text-white disabled:border-none disabled:cursor-not-allowed"
          >
            {isLoading ? "Resetting..." : "Reset password"}
          </button>
        </form>
          
        {/* ========== MESSAGE ========== */}
        {message && (
          <p className="mt-4 text-sm text-slate-700">
            {message}
          </p>
        )}

        {/* ========== BACK TO LOGIN  ========== */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={tertiaryButtonClass}
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
}