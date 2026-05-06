import { useNavigate } from "react-router-dom";
import { FiLogIn, FiUserPlus } from "react-icons/fi"
import { primaryButtonClass, secondaryButtonClass } from "@/styles/UIClasses.jsx"
export default function AuthHeaderNav() {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 inset-x-0 z-[9999] bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer font-semibold text-base sm:text-lg text-slate-900"
        >
          Matcha
        </div>

        {/* Nav actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            <FiLogIn size={15} />
            <span className="ml-1">Login</span>
          </button>
          <button
            onClick={() => navigate("/register")}
            className={primaryButtonClass}
          >
            <FiUserPlus size={15} />
            <span className="ml-1"> Register </span>
          </button>

        </div>
      </div>
    </header>
  );
}