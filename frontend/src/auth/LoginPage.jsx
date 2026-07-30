import { NavLink } from "react-router-dom";
import { useLogin } from "./hooks/useLogin";
import { FormInput, PasswordInput } from "@/utils/components";
import { 
  cardClass, 
  inputClass, 
  primaryButtonClass
} from "@/styles/UIClasses.jsx";

export default function LoginPage({ onLogin }) {
  const { form, message, handleChange, handleSubmit } = useLogin(onLogin);

  return (
    <section className={cardClass}>
      {/*========== HEADER ==========*/}
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-primary-dark font-semibold">
          Welcome back
        </p>
        <h2 className="text-2xl font-semibold text-neutral-dark">Login</h2>
        <p className="text-sm text-slate-500">
          Student portfolio demo only. All seeded users, profiles, and photos are test data.
        </p>
      </div>

      {/*========== FORM ==========*/}
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
          <span className="text-primary-dark ml-1">*</span>

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

        {/* FORGOT PASSWORD */}
        <div className="text-right">
          <NavLink
            to="/forgot-password"
            className="text-xs font-semibold text-primary-dark hover:underline"
          >
            Forgot password?
          </NavLink>
        </div>
      </form>

      {/*========== MESSAGE ==========*/}
      {message && <p className="text-sm text-slate-600">{message}</p>}

      {/*========== DEMO ACCESS ==========*/}
      <div className="rounded-2xl border border-primary/20 bg-primary-light/40 p-4 space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-primary-dark font-semibold">
          Demo Access
        </p>
        <p className="text-sm text-slate-700">
          Use one of these accounts to explore the app quickly, or register a new one in this demo.
        </p>
        <div className="space-y-2 text-sm text-neutral-dark">
          <p>
            <span className="font-semibold">user1@test.com</span>
            {" / "}
            <span className="font-mono">Qwerty999</span>
          </p>
          <p>
            <span className="font-semibold">user2@test.com</span>
            {" / "}
            <span className="font-mono">Qwerty999</span>
          </p>
        </div>
      </div>
    </section>
  );
}
