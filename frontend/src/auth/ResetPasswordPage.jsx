import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { tertiaryButtonClass } from "@/styles/UIClasses.jsx";
import PasswordFields from "./components/PasswordFields.jsx";

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
      return setMessage("Error: Missing reset token.");
    }

    if (!form.new_password || !form.confirm_password) {
      return setMessage("Error: Please fill all fields.");
    }

    if (form.new_password !== form.confirm_password) {
      return setMessage("Passwords do not match");
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
        return setMessage(data.error || "Reset failed");
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
          <PasswordFields
            firstLabel="New password"
            firstName="new_password"
            firstValue={form.new_password}
            firstPlaceholder="New password"
            secondLabel="Reenter password"
            secondName="confirm_password"
            secondValue={form.confirm_password}
            secondPlaceholder="Reenter password"
            onChange={handleChange}
            className="w-full rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary px-3 py-2"
          />

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