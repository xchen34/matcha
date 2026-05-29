import { useNavigate } from "react-router-dom";
import { useRegister } from "./hooks/useRegister";
import { FormInput, EmailPreviewLinks } from "@/utils/components";
import PasswordFields from "./components/PasswordFields.jsx";
import { MIN_BIRTH_DATE_ISO } from "@/utils/date.js";
import { 
  cardClass, 
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/styles/UIClasses.jsx";

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
      {/* ========== HEADER ========== */}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-primary-dark font-semibold">
          Get started
        </p>
        <h2 className="text-2xl font-semibold text-neutral-dark">Register</h2>
      </div>

      {/*  ========== REGISTER FORM ========== */}
      <form onSubmit={handleSubmit} className="space-y-3">

        {/* EMAIL */}
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

        {/* USERNAME */}
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

        {/* FIRST NAME */}
        <FormInput
          label="First name"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          placeholder="Your first name"
          required
        />

        {/* LAST NAME */}
        <FormInput
          label="Last name"
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          placeholder="Your last name"
          required
        />

        {/* BIRTH DATE */}
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
        <PasswordFields
          firstLabel="Password"
          firstName="password"
          firstValue={form.password}
          firstPlaceholder="Create a strong password"
          secondLabel="Reenter Password"
          secondName="confirmPassword"
          secondValue={form.confirmPassword}
          secondPlaceholder="Reenter password"
          onChange={handleChange}
          className={inputClass}
        />

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

      {/*  ========== MESSAGE ========== */}
      {message && <p className="text-sm text-slate-600">{message}</p>}

      <EmailPreviewLinks previewUrl={previewUrl} devVerifyUrl={devVerifyUrl} />

      {/*  ========== EMAIL SENT PAGE LINK  ========== */}
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