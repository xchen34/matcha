import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FaLocationArrow } from "react-icons/fa";
import { FiCalendar, FiCompass, FiEye, FiHeart, FiImage, FiInfo, 
  FiLogIn, FiLogOut, FiMail, FiMapPin, FiMessageCircle, FiSettings, 
  FiSlash, FiTag, FiTrash2, FiUser, FiUserPlus, FiUsers} from "react-icons/fi";
import UserCard from "../components/UserCard";
import FindMatchPage from "../pages/FindMatchPage";
import BlockedUsersPage from "../pages/BlockedUsersPage";
import PopularityListPage from "../pages/PopularityListPage";
import UserProfilePage from "../pages/UserProfilePage";
import MessagesPage from "../pages/MessagesPage.jsx";
import VerifyEmailPage from "../pages/VerifyEmailPage.jsx";
import ResendVerificationPage from "../pages/ResendVerificationPage.jsx";
import VerificationSentPage from "../pages/VerificationSentPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../pages/ResetPasswordPage.jsx";
import { NotificationsProvider } from "../notifications/NotificationsProvider.jsx";
import NotificationsBell from "../notifications/NotificationsBell.jsx";
import { useNotifications } from "../notifications/useNotifications.js";
import { connectRealtime, disconnectRealtime, getRealtimeSocket } from "../realtime/socket.js";
import { MAX_PHOTO_SIZE_BYTES, MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT, validatePhotoFile } from "../utils/photoValidator.js";
import { buildApiHeaders } from "../utils.js";
import ChatIndicator from "../chat/ChatIndicator.jsx";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";
const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition";
const textareaClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[140px]";
const selectClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition bg-white";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-5 py-2.5 text-sm font-semibold shadow-md shadow-orange-200 hover:-translate-y-0.5 hover:shadow-lg transition disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition";

  const STORAGE_KEY = "matcha.currentUser";

function writeStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function persistUser(user) {
    writeStoredUser(user);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Submitting...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data?.requires_email_verification) {
          const fallbackEmail =
            (typeof data?.email === "string" && data.email.trim()) ||
            ((form.username || "").includes("@") ? form.username.trim() : "");
          setMessage("Email not verified. Redirecting to verification help...");
          setTimeout(() => {
            navigate("/resend-verification", {
              state: {
                prefillEmail: fallbackEmail,
                from: "login-blocked",
              },
            });
          }, 400);
          return;
        }
        setMessage(`Error: ${data.error || "Login failed"}`);
        return;
      }

      persistUser(data.user);
      onLogin(data.user);
      setMessage(`Success: welcome ${data.user.username}`);
      const nextPath = data?.user?.profile_completed ? "/find-match" : "/profile";
      setTimeout(() => navigate(nextPath), 400);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Welcome back
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Login</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
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
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <FiEye size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Login
        </button>
        <div className="text-right">
          <NavLink to="/forgot-password" className="text-xs font-semibold text-brand-deep hover:underline">
            Forgot password?
          </NavLink>
        </div>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}