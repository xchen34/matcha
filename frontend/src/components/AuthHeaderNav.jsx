import { useNavigate } from "react-router-dom";
import { primaryButtonClass, secondaryButtonClass } from "@/styles/UIClasses.jsx"
import { LogIn, UserPlus } from "lucide-react"

export default function AuthHeaderNav() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 inset-x-0 z-[9999] bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer font-semibold text-primary-dark sm:text-lg"
        >
          Matcha
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            <LogIn size={15} />
            <span className="ml-1">Login</span>
          </button>

          <button
            onClick={() => navigate("/register")}
            className={primaryButtonClass}
          >
            <UserPlus size={15} />
            <span className="ml-1"> Register </span>
          </button>

        </div>
      </div>
    </header>
  );
}