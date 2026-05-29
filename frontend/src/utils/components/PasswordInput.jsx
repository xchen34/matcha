import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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