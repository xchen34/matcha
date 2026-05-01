import { useNavigate } from "react-router-dom";
import { useRegister } from "./hooks/useRegister";
import PasswordInput from "./components/PasswordInput";
import { MIN_BIRTH_DATE_ISO } from "../utils/date.js";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../styles/UIClasses.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();

  const {
    form,
    message,
    previewUrl,
    devVerifyUrl,
    maxAdultBirthDateIso,
    handleChange,
    handleSubmit,
  } = useRegister();

  const normalizedEmail = form.email?.trim().toLowerCase();

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Get started
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Register</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* EMAIL */}
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
          <p className="text-xs text-slate-500">
            Used for account recovery and notifications.
          </p>
        </div>

        {/* USERNAME */}
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
          <p className="text-xs text-slate-500">
            2-20 chars, letters/numbers and . _ - only.
          </p>
        </div>

        {/* FIRST NAME */}
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

        {/* LAST NAME */}
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

        {/* BIRTH DATE */}
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
          <p className="text-xs text-slate-500">
            You must be at least 18 years old.
          </p>
        </div>

        {/* PASSWORDS*/}
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
            placeholder="Create a strong password"
            required
          />

          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Reenter Password
          </label>
          <PasswordInput
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            className={inputClass}
            placeholder="Reenter password"
            required
          />

          {form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="text-xs text-red-500">
              Passwords do not match
            </p>
          )}
        </div>

        {/* SUBMIT */}
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButtonClass}>
            Register
          </button>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            Go to login
          </button>
        </div>
      </form>

      {/* VERIFICATION PREVIEW */}
      {message && <p className="text-sm text-slate-600">{message}</p>}

      {previewUrl && (
        <p className="text-sm text-slate-700">
          Email preview:{" "}
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
          Fallback verify link:{" "}
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

      {/* ACTIONS */}
      {(previewUrl || devVerifyUrl) && (
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
          </div>
        </div>
)}
    </section>
  );
}