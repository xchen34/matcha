import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

//PasswordInput is a reusable component for password inputs
//it is used in the login, register, forgot-password, and reset-password pages
//why use it this way because we can reduce the code duplication and make the code more maintainable
//it can also be used in the profile page for editing the user profile
export default function PasswordInput({ className = "", ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      {/* Password input */}
      <input
        {...props}
        type={show ? "text" : "password"}
        className={`${className} pr-12`}
      />

      {/* Show/hide toggle */}
      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}  //use prev to toggle the state of show, if show is true, it will become false, and if show is false, it will become true
        className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700"
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}