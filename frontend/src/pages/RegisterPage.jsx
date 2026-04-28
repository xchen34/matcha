import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye} from "react-icons/fi";
import { MIN_BIRTH_DATE_ISO, isValidBirthDateIso, getMaxAdultBirthDateIso } from "../utils/date.js";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";
const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-5 py-2.5 text-sm font-semibold shadow-md shadow-orange-200 hover:-translate-y-0.5 hover:shadow-lg transition disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const maxAdultBirthDateIso = getMaxAdultBirthDateIso();
  const normalizedEmail = (form.email || "").trim();
  const passwordsMatch =
    form.password && form.confirmPassword &&
    form.password === form.confirmPassword;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Submitting...");
    setPreviewUrl("");
    setDevVerifyUrl("");

    if (!isValidBirthDateIso(form.birth_date, MIN_BIRTH_DATE_ISO, maxAdultBirthDateIso)) {
      setMessage(
        `Error: birth date must be a valid date between ${MIN_BIRTH_DATE_ISO} and ${maxAdultBirthDateIso}.`,
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Register failed"}`);
        return;
      }

      const delivery = data?.email_delivery;
      if (data?.dev_verify_url) {
        setDevVerifyUrl(data.dev_verify_url);
      }
      if (delivery?.sent && delivery?.preview_url) {
        setPreviewUrl(delivery.preview_url);
        setMessage(
          "Success: account created. Dev mode uses Ethereal test inbox, open the preview link below to verify your email.",
        );
      } else if (delivery?.sent) {
        setMessage("Success: account created. Please check your email inbox for the verification link.");
      } else {
        setMessage(
          `Success: account created, but verification email could not be sent (${delivery?.reason || "unknown error"}). Use Resend Verification later.`,
        );
      }

      setTimeout(() => {
        navigate("/verification-sent", {
          state: {
            prefillEmail: normalizedEmail,
            previewUrl: delivery?.preview_url || null,
            devVerifyUrl: data?.dev_verify_url || null,
          },
        });
      }, 500);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }
  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Get started
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Register</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Email address
          </label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
            required
          />
          <p className="text-xs text-slate-500">Used for account recovery and notifications.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Username
          </label>
          <input
            name="username"
            placeholder="Choose a unique username"
            value={form.username}
            onChange={handleChange}
            className={inputClass}
            pattern="[A-Za-z0-9._\-]{2,20}"
            title="2-20 characters: letters, numbers, dot, underscore, hyphen"
            required
          />
          <p className="text-xs text-slate-500">2-20 chars, letters/numbers and . _ - only.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            First name
          </label>
          <input
            name="first_name"
            placeholder="Your first name"
            value={form.first_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Last name
          </label>
          <input
            name="last_name"
            placeholder="Your last name"
            value={form.last_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Birth date
          </label>
          <input
            name="birth_date"
            type="date"
            value={form.birth_date}
            onChange={handleChange}
            className={inputClass}
            min={MIN_BIRTH_DATE_ISO}
            max={maxAdultBirthDateIso}
            required
          />
          <p className="text-xs text-slate-500">Required to verify you are at least 18 years old.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <FiEye size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-slate-500">Avoid common passwords and use a secure one.</p>
        </div>
         <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Reenter Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="reenter password"
              value={form.confirmPassword}
              onChange={handleChange}
              className={`${inputClass} pr-12`}
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="text-xs text-red-500">
                Passwords do not match
              </p>
            )}
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <FiEye size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Register
        </button>
        <p className="text-xs text-slate-500">You must be at least 18 years old.</p>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      {previewUrl && (
        <p className="text-sm text-slate-700">
          Email preview: {" "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-deep underline"
          >
            Open verification email
          </a>
        </p>
      )}
      {devVerifyUrl && (
        <p className="text-sm text-slate-700">
          Fallback verify link: {" "}
          <a
            href={devVerifyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-brand-deep underline"
          >
            Verify directly on local app
          </a>
        </p>
      )}
      <div className="pt-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              navigate("/resend-verification", {
                state: {
                  prefillEmail: normalizedEmail,
                  previewUrl: previewUrl || null,
                  devVerifyUrl: devVerifyUrl || null,
                  from: "register",
                },
              })
            }
            className={secondaryButtonClass}
          >
            Email sent page
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            Go to login
          </button>
        </div>
      </div>
    </section>
  );
}