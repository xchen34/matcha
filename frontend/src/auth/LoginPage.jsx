import { NavLink } from "react-router-dom";
import PasswordInput from "./components/PasswordInput";
import { useLogin } from "./hooks/useLogin";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "../styles/UIClasses.jsx";
import FormInput from "./components/FormInput";

export default function LoginPage({ onLogin }) {
  const { form, message, handleChange, handleSubmit } = useLogin(onLogin);

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-primary-dark font-semibold">
          Welcome back
        </p>
        <h2 className="text-2xl font-semibold text-neutral-dark">Login</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* USERNAME */}
        <FormInput
          label="Username or email"
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Enter username or email"
          required
        />

        {/* PASSWORD */}
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>

          <PasswordInput
            name="password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
            placeholder="Enter your password"
            required
          />
        </div>

        {/* SUBMIT */}
        <button type="submit" className={primaryButtonClass}>
          Login
        </button>

        {/* FORGOT */}
        <div className="text-right">
          <NavLink
            to="/forgot-password"
            className="text-xs font-semibold text-primary-dark hover:underline"
          >
            Forgot password?
          </NavLink>
        </div>
      </form>

      {/* MESSAGE */}
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}