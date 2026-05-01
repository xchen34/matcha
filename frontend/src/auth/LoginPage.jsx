import { NavLink } from "react-router-dom";
import PasswordInput from "./components/PasswordInput";
import { useLogin } from "./hooks/useLogin";
import { cardClass, inputClass, primaryButtonClass } from "../styles/UIClasses.jsx";

export default function LoginPage({ onLogin }) {
  const { form, message, handleChange, handleSubmit } = useLogin(onLogin);

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Welcome back
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* USERNAME */}
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Username or email
          </label>
          <input
            name="username"
            placeholder="Enter username or email"
            value={form.username}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>

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
            className="text-xs font-semibold text-brand-deep hover:underline"
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