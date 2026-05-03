import { useNavigate } from "react-router-dom";
import { useRegister } from "./hooks/useRegister";
import PasswordInput from "./components/PasswordInput";
import { MIN_BIRTH_DATE_ISO } from "../utils/date.js";
import {
  cardClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "../styles/UIClasses.jsx";
import FormInput from "./components/FormInput";

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

        <FormInput
          label="Email address"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          description="Used for account recovery and notifications."
          required
        />

        <FormInput
          label="Username"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Choose a unique username"
          description="2-20 chars, letters/numbers and . _ - only."
          pattern="[A-Za-z0-9._\-]{2,20}"
          title="2-20 characters: letters, numbers, dot, underscore, hyphen"
          required
        />

        <FormInput
          label="First name"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          placeholder="Your first name"
          required
        />

        <FormInput
          label="Last name"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          placeholder="Your last name"
          required
        />

        <FormInput
          label="Birth date"
          name="birth_date"
          type="date"
          value={form.birth_date}
          onChange={handleChange}
          min={MIN_BIRTH_DATE_ISO}
          max={maxAdultBirthDateIso}
          description="You must be at least 18 years old."
          required
        />

        {/* PASSWORDS */}
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

          {form.confirmPassword &&
            form.password !== form.confirmPassword && (
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
      {message && (
        <p className="text-sm text-slate-600">{message}</p>
      )}

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