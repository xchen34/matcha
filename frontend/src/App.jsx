import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FaLocationArrow } from "react-icons/fa";
import {
  FiCalendar,
  FiCompass,
  FiEye,
  FiHeart,
  FiImage,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiSettings,
  FiSlash,
  FiTag,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import UserCard from "./components/UserCard";
import FindMatchPage from "./pages/FindMatchPage";
import BlockedUsersPage from "./pages/BlockedUsersPage";
import PopularityListPage from "./pages/PopularityListPage";
import UserProfilePage from "./pages/UserProfilePage";
import MessagesPage from "./pages/MessagesPage.jsx";
import VerifyEmailPage from "./pages/VerifyEmailPage.jsx";
import ResendVerificationPage from "./pages/ResendVerificationPage.jsx";
import VerificationSentPage from "./pages/VerificationSentPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import { NotificationsProvider } from "./notifications/NotificationsProvider.jsx";
import NotificationsBell from "./notifications/NotificationsBell.jsx";
import { useNotifications } from "./notifications/useNotifications.js";
import { connectRealtime, disconnectRealtime, getRealtimeSocket } from "./realtime/socket.js";
import {
  MAX_PHOTO_SIZE_BYTES,
  MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT,
  validatePhotoFile,
} from "./utils/photoValidator.js";
import { buildApiHeaders } from "./utils.js";
import ChatIndicator from "./chat/ChatIndicator.jsx";
const STORAGE_KEY = "matcha.currentUser";
const MAX_BIO_LENGTH = 500;

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

function TopNav({ currentUser, profileLocked }) {
  const location = useLocation();
  const { attentionBadges = {}, clearAttentionMode } = useNotifications();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    if (previousPath === "/popularity/views") {
      clearAttentionMode("views");
    } else if (previousPath === "/popularity/likes") {
      clearAttentionMode("likes");
    } else if (previousPath === "/popularity/matches") {
      clearAttentionMode("matches");
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname, clearAttentionMode]);

  const modeCounts = {
    views: Number(attentionBadges.views || 0),
    likes: Number(attentionBadges.likes || 0),
    matches: Number(attentionBadges.matches || 0),
  };

  const navItem = (icon, mobile, full, count) => (
    <span className="relative flex items-center justify-center sm:justify-start gap-1.5">

      <span aria-hidden="true">{icon}</span>

      <span className="sm:hidden text-xs font-medium text-slate-700">
        {mobile}
      </span>

      <span className="hidden sm:inline text-sm font-medium text-slate-700">
        {full}
      </span>

      {count > 0 && (
        <span className="absolute -right-4 -top-3 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  return (
    <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">

      {!currentUser && (
        <NavLink to="/login" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiLogIn size={15} />
            <span>Login</span>
          </span>
        </NavLink>
      )}

      {!currentUser && (
        <NavLink to="/register" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiUserPlus size={15} />
            <span className="sm:inline hidden">Create Account</span>
            <span className="sm:hidden">Join</span>
          </span>
        </NavLink>
      )}

      {currentUser && profileLocked && (
        <NavLink to="/profile" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiUser size={15} />
            <span className="sm:inline hidden">Complete Profile</span>
            <span className="sm:hidden">Profile</span>
          </span>
        </NavLink>
      )}

      {currentUser && !profileLocked && (
        <>
          <NavLink to="/find-match" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiUsers size={15} />, "Find", "Find your match")}
          </NavLink>

          <NavLink to="/popularity/views" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiEye size={15} />, "Views", "Who viewed me", modeCounts.views)}
          </NavLink>

          <NavLink to="/popularity/likes" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiHeart size={15} />, "Likes", "Who liked me", modeCounts.likes)}
          </NavLink>

          <NavLink to="/popularity/matches" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(
              <span className="relative inline-flex h-4 w-5 items-center justify-center text-slate-500">
                <FiHeart size={11} className="absolute left-0" />
                <FiHeart size={11} className="absolute right-0" />
              </span>,
              "Matches",
              "Matches",
              modeCounts.matches,
            )}
          </NavLink>
        </>
      )}
    </nav>
  );
}

function ProtectedRoute({ currentUser, requireCompletedProfile = true, children }) {
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (requireCompletedProfile && !currentUser.profile_completed) {
    return <Navigate to="/profile" replace />;
  }
  return children;
}

function bytesToKB(value) {
  return Math.round(value / 1024);
}

function normalizeLocationPrefix(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getValidationCacheKey(city, neighborhood, latitude, longitude) {
  return [
    normalizeLocationPrefix(city),
    normalizeLocationPrefix(neighborhood),
    latitude || "",
    longitude || "",
  ].join("|");
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const userId = parsed?.id ?? parsed?.user_id ?? parsed?.userId;
    if (!parsed || !Number.isInteger(Number(userId))) {
      return null;
    }

    return {
      ...parsed,
      id: Number(userId),
    };
  } catch {
    return null;
  }
}

function writeStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}


function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [devVerifyUrl, setDevVerifyUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const todayIso = new Date().toISOString().slice(0, 10);
  const normalizedEmail = (form.email || "").trim();

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Submitting...");
    setPreviewUrl("");
    setDevVerifyUrl("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Register failed"}`);
        return;
      }

      const delivery = data?.email_delivery;
      if (data?.dev_verify_url) {
        setDevVerifyUrl(data.dev_verify_url);
      }
      if (delivery?.sent && delivery?.preview_url) {
        setPreviewUrl(delivery.preview_url);
        setMessage(
          "Success: account created. Dev mode uses Ethereal test inbox, open the preview link below to verify your email.",
        );
      } else if (delivery?.sent) {
        setMessage("Success: account created. Please check your email inbox for the verification link.");
      } else {
        setMessage(
          `Success: account created, but verification email could not be sent (${delivery?.reason || "unknown error"}). Use Resend Verification later.`,
        );
      }

      setTimeout(() => {
        navigate("/verification-sent", {
          state: {
            prefillEmail: normalizedEmail,
            previewUrl: delivery?.preview_url || null,
            devVerifyUrl: data?.dev_verify_url || null,
          },
        });
      }, 500);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }
  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Get started
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Register</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Email address
          </label>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={handleChange}
            className={inputClass}
          />
          <p className="text-xs text-slate-500">Used for account recovery and notifications.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Username
          </label>
          <input
            name="username"
            placeholder="Choose a unique username"
            value={form.username}
            onChange={handleChange}
            className={inputClass}
            pattern="[A-Za-z0-9._\-]{1,20}"
            title="2-20 characters: letters, numbers, dot, underscore, hyphen"
            required
          />
          <p className="text-xs text-slate-500">2-20 chars, letters/numbers and . _ - only.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            First name
          </label>
          <input
            name="first_name"
            placeholder="Your first name"
            value={form.first_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Last name
          </label>
          <input
            name="last_name"
            placeholder="Your last name"
            value={form.last_name}
            onChange={handleChange}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Birth date
          </label>
          <input
            name="birth_date"
            type="date"
            value={form.birth_date}
            onChange={handleChange}
            className={inputClass}
            max={todayIso}
          />
          <p className="text-xs text-slate-500">Required to verify you are at least 18 years old.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
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
          <p className="text-xs text-slate-500">Avoid common passwords and use a secure one.</p>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Register
        </button>
        <p className="text-xs text-slate-500">You must be at least 18 years old.</p>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
      {previewUrl && (
        <p className="text-sm text-slate-700">
          Email preview: {" "}
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
          Fallback verify link: {" "}
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
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={secondaryButtonClass}
          >
            Go to login
          </button>
        </div>
      </div>
    </section>
  );
}

function LoginPage({ onLogin }) {
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

function ProfilePage({ currentUser, onProfileUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    gender: "",
    sexual_preference: "",
    biography: "",
    birth_date: "",
    city: "",
    neighborhood: "",
    gps_consent: false,
    latitude: "",
    longitude: "",
    tags: [],
    photos: [],
  });
  
  const [selectedTag, setSelectedTag] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [citySearchSuggestions, setCitySearchSuggestions] = useState([]);
  const [locationValidation, setLocationValidation] = useState(null);
  const [cityNeighborhoodOptions, setCityNeighborhoodOptions] = useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [message, setMessage] = useState("");
  const [emailChangePreviewUrl, setEmailChangePreviewUrl] = useState("");
  const [emailChangeDevVerifyUrl, setEmailChangeDevVerifyUrl] = useState("");
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeForm, setEmailChangeForm] = useState({
    new_email: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [isNeighborhoodSelected, setIsNeighborhoodSelected] = useState(false);
  const [isCityConfirmed, setIsCityConfirmed] = useState(false);
  const userId = currentUser?.id ?? null;
  const validationCacheRef = useRef(new Map());
  const cityNeighborhoodCacheRef = useRef(new Map());
  const latestValidationRequestRef = useRef(0);
  const hasCityInput = (form.city || "").trim().length > 0;
  const hasNeighborhoodInput = (form.neighborhood || "").trim().length > 0;
  // Required fields logic
  const hasUsername = (form.username || "").trim().length > 0;
  const hasFirstName = (form.first_name || "").trim().length > 0;
  const hasLastName = (form.last_name || "").trim().length > 0;
  const hasEmail = (form.email || "").trim().length > 0;
  const hasGender = (form.gender || "").trim().length > 0;
  const hasAge = (form.birth_date || "").trim().length > 0;
  const hasCity = (form.city || "").trim().length > 0;

  const hasRequiredFields =
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasAge &&
    hasCity;

  const missingRequiredFields = [
    !hasUsername ? "username" : null,
    !hasFirstName ? "first name" : null,
    !hasLastName ? "last name" : null,
    !hasEmail ? "email" : null,
    !hasGender ? "gender" : null,
    !hasAge ? "age" : null,
    !hasCity ? "city" : null,
  ].filter(Boolean);
  const isLocationAccepted =
    Boolean(locationValidation?.is_valid) ||
    (isCityConfirmed && !hasNeighborhoodInput);

  const canSaveProfile =
    !loading &&
    !validatingLocation &&
    isLocationAccepted &&
    hasRequiredFields;
  const canAttemptSaveProfile = !loading && !validatingLocation;
  const isCitySelected =
    (form.city || "").trim().length > 0 &&
    (isCityConfirmed ||
      (!validatingLocation && Boolean(locationValidation?.city_exists)));
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function buildSuggestionKey(suggestion) {
    return `${suggestion.city || ""}-${suggestion.display_name || ""}-${suggestion.latitude ?? ""}-${suggestion.longitude ?? ""}`;
  }

  const citySuggestionOptions = useMemo(() => {
    const sourceSuggestions =
      citySearchSuggestions.length > 0
        ? citySearchSuggestions
        : locationSuggestions;

    return sourceSuggestions
      .filter((item) => (item.city || "").trim().length > 0)
      .map((item) => ({
        key: buildSuggestionKey(item),
        city: item.city,
        neighborhood: item.neighborhood || "",
        label: item.display_name,
      }));
  }, [citySearchSuggestions, locationSuggestions]);

  const neighborhoodByCitySuggestions = useMemo(() => {
    const selectedCity = normalizeLocationPrefix(form.city);
    if (!selectedCity) return [];

    const byNeighborhood = new Map();
    for (const item of locationSuggestions) {
      const itemCity = normalizeLocationPrefix(item.city);
      const itemNeighborhood = (item.neighborhood || "").trim();
      if (!itemNeighborhood || itemCity !== selectedCity) continue;

      const neighborhoodKey = normalizeLocationPrefix(itemNeighborhood);
      if (!byNeighborhood.has(neighborhoodKey)) {
        byNeighborhood.set(neighborhoodKey, {
          value: itemNeighborhood,
          label: `${itemNeighborhood} - ${item.display_name}`,
        });
      }
    }

    return Array.from(byNeighborhood.values())
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: "base" }))
      .slice(0, 20);
  }, [locationSuggestions, form.city]);

  const neighborhoodByCityOptions =
    cityNeighborhoodOptions.length > 0
      ? cityNeighborhoodOptions
      : neighborhoodByCitySuggestions;

  const cityAutocompleteOptions = useMemo(() => {
    const prefix = normalizeLocationPrefix(form.city);
    if (!prefix) return [];

    return citySuggestionOptions
      .filter((item) => {
        const normalizedCity = normalizeLocationPrefix(item.city);
        return (
          normalizedCity.startsWith(prefix) || normalizedCity.includes(prefix)
        );
      })
      .slice(0, 12);
  }, [citySuggestionOptions, form.city]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCitySuggestions() {
      if (!userId) {
        setCitySearchSuggestions([]);
        return;
      }

      const city = (form.city || "").trim();
      if (city.length < 2) {
        setCitySearchSuggestions([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("query", city);
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-suggestions?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );

        const data = await response.json();
        if (!response.ok || cancelled) {
          if (!cancelled) {
            setMessage(
              `City suggestions unavailable (${response.status}). ${data?.error || "Check backend logs."}`,
            );
          }
          return;
        }

        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions.map((item) => ({
              city: item.city,
              neighborhood: "",
              display_name: item.display_name || item.city,
            }))
          : [];

        if (!cancelled) {
          setCitySearchSuggestions(suggestions);
        }
      } catch {

        if (!cancelled) {
          setCitySearchSuggestions([]);
          setMessage("City suggestions failed. Check backend availability.");
        }
      }
    }

    const timeoutId = setTimeout(fetchCitySuggestions, 220);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [userId, form.city]);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile/me", {
        headers: buildApiHeaders({ id: userId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Failed to load profile"}`);
        setLoading(false);

        if (response.status === 401) {
          setMessage("Not authorized. Please login again if needed.");
        }

        return;
      }

      setForm({
        username: data.user?.username || currentUser?.username || "",
        first_name: data.user?.first_name || "",
        last_name: data.user?.last_name || "",
        email: data.user?.email || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
        biography: data.profile.biography || "",
        birth_date: data.profile.birth_date
          ? String(data.profile.birth_date).slice(0, 10)
          : "",
        city: data.profile.city || "",
        neighborhood: data.profile.neighborhood || "",
        gps_consent: Boolean(data.profile.gps_consent),
        latitude:
          data.profile.latitude !== null && data.profile.latitude !== undefined
            ? String(data.profile.latitude)
            : "",
        longitude:
          data.profile.longitude !== null && data.profile.longitude !== undefined
            ? String(data.profile.longitude)
            : "",
        tags: Array.isArray(data.profile.tags) ? data.profile.tags : [],
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
      });
      setIsCityConfirmed(Boolean((data.profile.city || "").trim()));
      if (data.user && typeof onProfileUpdate === "function") {
        const nextUser = {
          ...(currentUser || {}),
          ...data.user,
        };
        writeStoredUser(nextUser);
        onProfileUpdate(nextUser);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.username, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTagOptions() {
      if (!userId) {
        return;
      }

      try {
        const response = await fetch("/api/profile/tags", {
          headers: buildApiHeaders({ id: userId }),
        });
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        setTagOptions(Array.isArray(data.tags) ? data.tags : []);
      } catch {
        if (!cancelled) {
          setTagOptions([]);
        }
      }
    }

    fetchTagOptions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "city") {
      setForm((prev) => ({
        ...prev,
        city: value,
        neighborhood: "",
      }));
      setIsCityConfirmed(false);
      setCityNeighborhoodOptions([]);
      setIsNeighborhoodSelected(false);
    } else if (name === "neighborhood") {
      setForm((prev) => ({
        ...prev,
        [name]: value,
      }));
      if (value.trim().length > 0) {
        setIsNeighborhoodSelected(true);
      } else {
        setIsNeighborhoodSelected(false);
      }
    } else {
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    }

    if (name === "city" || name === "neighborhood") {
      setLocationValidation(null);
      if (name === "city") {
        setCitySearchSuggestions([]);
      }
    }

    if (name === "latitude" || name === "longitude" || name === "gps_consent") {
      setLocationValidation(null);
      setLocationSuggestions([]);
    }
  }

  function handleEmailChangeInput(event) {
    const { name, value } = event.target;
    setEmailChangeForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleEmailChangeSubmit() {
    if (!userId) {
      setMessage("Please login first.");
      return;
    }

    const newEmail = (emailChangeForm.new_email || "").trim();
    const password = emailChangeForm.password || "";
    if (!newEmail || !password) {
      setMessage("Error: new email and password are required.");
      return;
    }

    setEmailChangeLoading(true);
    setEmailChangePreviewUrl("");
    setEmailChangeDevVerifyUrl("");
    try {
      const response = await fetch("/api/auth/request-email-change", {
        method: "POST",
        headers: buildApiHeaders(
          { id: userId },
          { "Content-Type": "application/json" },
        ),
        body: JSON.stringify({ new_email: newEmail, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(`Error: ${data.error || "Unable to request email change"}`);
        return;
      }

      let successMessage =
        data.message ||
        "A verification email has been sent. Your email will change only after verification.";

      if (data?.email_delivery?.preview_url) {
        setEmailChangePreviewUrl(data.email_delivery.preview_url);
      }
      if (data?.dev_verify_url) {
        setEmailChangeDevVerifyUrl(data.dev_verify_url);
      }

      setMessage(successMessage);
      setEmailChangeForm({ new_email: "", password: "" });
      setEmailChangeOpen(false);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setEmailChangeLoading(false);
    }
  }

  function handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remaining = Math.max(0, MAX_PHOTOS_COUNT - form.photos.length);
    if (remaining <= 0) {
      setMessage(`Error: maximum ${MAX_PHOTOS_COUNT} photos allowed.`);
      event.target.value = "";
      return;
    }

    const slice = files.slice(0, remaining);

    const currentApproxTotal = form.photos.reduce(
      (sum, photo) => sum + String(photo.data_url || "").length,
      0,
    );
    const newFilesTotal = slice.reduce((sum, file) => sum + file.size, 0);
    if (currentApproxTotal + newFilesTotal > MAX_TOTAL_PHOTOS_SIZE_BYTES) {
      setMessage(
        `Error: total photos size exceeds ${bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB. Remove a photo first.`,
      );
      event.target.value = "";
      return;
    }

    for (const file of slice) {
      const result = validatePhotoFile(file);
      if (!result.valid) {
        setMessage(`Error: ${result.error}`);
        event.target.value = "";
        return;
      }
    }

    const readers = slice.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              data_url: String(reader.result),
              is_primary: false,
              name: file.name,
            });
          reader.readAsDataURL(file);
        }),
    );

    Promise.all(readers).then((newPhotos) => {
      setForm((prev) => {
        const merged = [...prev.photos, ...newPhotos];
        if (!merged.some((p) => p.is_primary) && merged.length > 0) {
          merged[0].is_primary = true;
        }
        return { ...prev, photos: merged };
      });
      setMessage("");
    });

    event.target.value = "";
  }

  function setPrimaryPhoto(index) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.map((photo, i) => ({
        ...photo,
        is_primary: i === index,
      })),
    }));
  }

  function removePhoto(index) {
    setForm((prev) => {
      const next = prev.photos.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((p) => p.is_primary)) {
        next[0].is_primary = true;
      }
      return { ...prev, photos: next };
    });
  }

  function normalizeTag(tag) {
    let value = (tag || "").trim().toLowerCase();
    if (!value) {
      return "";
    }
    if (!value.startsWith("#")) {
      value = `#${value}`;
    }
    return /^#[a-z0-9_]{1,30}$/.test(value) ? value : "";
  }

  function addTag(rawTag) {
    const tag = normalizeTag(rawTag);
    if (!tag) {
      setMessage("Error: invalid tag format. Use letters, numbers or underscore.");
      return;
    }

    if (form.tags.length >= 10) {
      setMessage("Error: maximum 10 tags allowed.");
      return;
    }

    setForm((prev) => {
      if (prev.tags.includes(tag)) {
        return prev;
      }
      return { ...prev, tags: [...prev.tags, tag] };
    });
    setSelectedTag("");
    setMessage("");
  }

  function removeTag(tagToRemove) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Error: geolocation is not available in your browser.");
      return;
    }

    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = String(position.coords.latitude.toFixed(6));
        const longitude = String(position.coords.longitude.toFixed(6));

        setForm((prev) => ({
          ...prev,
          gps_consent: true,
          latitude,
          longitude,
        }));

        try {
          const response = await fetch(
            `/api/profile/reverse-geocode?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
            {
              headers: buildApiHeaders({ id: userId }),
            },
          );
          const data = await response.json();

          if (response.ok) {
            setForm((prev) => ({
              ...prev,
              city: data.city || prev.city,
              neighborhood: data.neighborhood || prev.neighborhood,
            }));
            setIsCityConfirmed(Boolean((data.city || "").trim()));
            setLocationValidation(null);
            setLocationSuggestions([]);
            setMessage(
              "GPS location detected. Verify city/neighborhood before saving.",
            );
          } else {
            setMessage("GPS detected. Please enter your neighborhood manually to confirm.");
          }
        } catch {
          setMessage("GPS detected. Reverse geocoding unavailable, please fill city/neighborhood manually.");
        } finally {
          setLoadingGeo(false);
        }
      },
      () => {
        setLoadingGeo(false);
        setMessage("Error: unable to retrieve your GPS location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const validateLocationInput = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!userId) {
        if (!silent) {
          setMessage("Please login first.");
        }
        return;
      }

      const city = (form.city || "").trim();
      const neighborhood = (form.neighborhood || "").trim();
      const latitude = (form.latitude || "").trim();
      const longitude = (form.longitude || "").trim();
      const cacheKey = getValidationCacheKey(
        city,
        neighborhood,
        latitude,
        longitude,
      );
      const cached = validationCacheRef.current.get(cacheKey);
      if (cached) {
        setLocationValidation(cached.validation || null);
        setLocationSuggestions(cached.suggestions || []);
        return;
      }

      if (!city && !neighborhood && (!latitude || !longitude)) {
        if (!silent) {
          setMessage("Enter city/neighborhood or coordinates before verification.");
        }
        return;
      }

      setValidatingLocation(true);
      if (!silent) {
        setMessage("Checking location...");
      }

      const requestId = latestValidationRequestRef.current + 1;
      latestValidationRequestRef.current = requestId;

      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (neighborhood) params.set("neighborhood", neighborhood);
      if (latitude) params.set("latitude", latitude);
      if (longitude) params.set("longitude", longitude);
      params.set("limit", "5");

      try {
        const response = await fetch(
          `/api/profile/validate-location?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );
        const data = await response.json();

      // Ignore stale responses from older requests (e.g. "Pari") arriving after newer ones (e.g. "Paris").
        if (requestId !== latestValidationRequestRef.current) {
          return;
        }

        if (!response.ok) {
          setLocationValidation(null);
          setLocationSuggestions([]);
          if (!silent) {
            setMessage(`Error: ${data.error || "Location verification failed"}`);
          }
          return;
        }

        setLocationValidation(data.validation || null);
        setLocationSuggestions(
          Array.isArray(data.suggestions) ? data.suggestions : [],
        );
        validationCacheRef.current.set(cacheKey, {
          validation: data.validation || null,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });

        if (data.validation?.is_valid) {
          if (!silent) {
            setMessage("Location verified. You can save safely.");
          }
        } else {
          if (!silent) {
            setMessage(
              "Location needs confirmation. Choose a suggestion or adjust your input.",
            );
          }
        }
      } catch (error) {
        if (requestId !== latestValidationRequestRef.current) {
          return;
        }
        setLocationValidation(null);
        setLocationSuggestions([]);
        if (!silent) {
          setMessage(`Error: ${error.message}`);
        }
      } finally {
        if (requestId === latestValidationRequestRef.current) {
          setValidatingLocation(false);
        }
      }
    },
    [form.city, form.latitude, form.neighborhood, form.longitude, userId],
  );

  function applyCitySuggestion(option) {
    setForm((prev) => ({
      ...prev,
      city: option.city,
      neighborhood: "",
    }));
    setIsCityConfirmed(true);
    setLocationValidation((prev) => ({
      ...(prev || {}),
      is_valid: true,
      city_exists: true,
      neighborhood_exists: true,
      matched_exact_suggestion: true,
    }));
    setCityNeighborhoodOptions([]);
    setCitySearchSuggestions([]);
    setIsNeighborhoodSelected(false);
    setIsCitySuggestionsOpen(false);
    setMessage("City suggestion selected. Choose a neighborhood.");
  }

  function handleEditLocation() {
    setForm((prev) => ({
      ...prev,
      neighborhood: "",
    }));
    setIsCityConfirmed(false);
    setCityNeighborhoodOptions([]);
    setLocationValidation(null);
    setIsNeighborhoodSelected(false);
    setMessage("Edit your city if needed.");
  }

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const city = (form.city || "").trim();
    const neighborhood = (form.neighborhood || "").trim();
    const latitude = (form.latitude || "").trim();
    const longitude = (form.longitude || "").trim();

    if (!city && !neighborhood) {
      setLocationValidation(null);
      setLocationSuggestions([]);
      return undefined;
    }

    // Avoid hammering validate-location while typing city only; city confirmation comes from suggestion click.
    if (city && !neighborhood && !latitude && !longitude && isCityConfirmed) {
      return undefined;
    }

    const handle = setTimeout(() => {
      validateLocationInput({ silent: true });
    }, 900);

    return () => clearTimeout(handle);
  }, [
    userId,
    form.city,
    form.neighborhood,
    form.latitude,
    form.longitude,
    form.gps_consent,
    isCityConfirmed,
    validateLocationInput,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCityNeighborhoods() {
      if (!userId || !hasCityInput || !isCitySelected) {
        setCityNeighborhoodOptions([]);
        setLoadingNeighborhoods(false);
        return;
      }

      const cityCacheKey = normalizeLocationPrefix(form.city);
      const cachedNeighborhoods = cityNeighborhoodCacheRef.current.get(cityCacheKey);
      if (cachedNeighborhoods) {
        setCityNeighborhoodOptions(cachedNeighborhoods);
        setLoadingNeighborhoods(false);
        return;
      }

      try {
        setLoadingNeighborhoods(true);
        const params = new URLSearchParams();
        params.set("city", form.city.trim());
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-neighborhoods?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        const options = Array.isArray(data.neighborhoods)
          ? data.neighborhoods.map((item) => ({
              value: item.name,
              label: `${item.name} - ${item.display_name}`,
            }))
          : [];

        if (!cancelled) {
          cityNeighborhoodCacheRef.current.set(cityCacheKey, options);
          setCityNeighborhoodOptions(options);
        }
      } catch {
        if (!cancelled) {
          setCityNeighborhoodOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingNeighborhoods(false);
        }
      }
    }

    loadCityNeighborhoods();
    return () => {
      cancelled = true;
    };
  }, [userId, hasCityInput, isCitySelected, form.city]);

  function handleCityInputChange(event) {
    handleChange(event);
    if (!isNeighborhoodSelected) {
      setIsCitySuggestionsOpen(true);
    }

    const typed = normalizeLocationPrefix(event.target.value);
    if (!typed) return;

    const matched = citySuggestionOptions.find(
      (item) => normalizeLocationPrefix(item.city) === typed,
    );
    if (matched) {
      applyCitySuggestion(matched);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasRequiredFields) {
      setMessage(
        `Error: required fields missing (${missingRequiredFields.join(", ")}).`,
      );
      return;
    }

    if (!hasGender) {
      setMessage("Error: please select your gender.");
      return;
    }

    if (!isLocationAccepted) {
      setMessage("Error: location is not verified. Please choose a valid city/neighborhood.");
      return;
    }

    setMessage("Submitting...");

    const headers = buildApiHeaders(
      { id: userId },
      {
        "Content-Type": "application/json",
      },
    );

    const payload = {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      gender: form.gender,
      sexual_preference: (form.sexual_preference || "both").trim(),
      biography: form.biography,
      birth_date: form.birth_date || null,
      city: form.city,
      neighborhood: form.neighborhood,
      gps_consent: form.gps_consent,
      latitude: form.latitude,
      longitude: form.longitude,
      tags: form.tags,
    };

    const photosAreBase64DataUrls =
      Array.isArray(form.photos) &&
      form.photos.every((photo) => {
        const dataUrl = String(photo?.data_url || "").trim();
        return /^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl);
      });

    // Preserve existing backend photos when current form photo URLs are not base64 data URLs.
    if (photosAreBase64DataUrls) {
      payload.photos = form.photos;
    }

    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Update failed"}`);

        if (response.status === 401) {
          setMessage("Not authorized. Please login again if needed.");
        }

        return;
      }

      setForm((prev) => ({
        ...prev,
        username: data.user?.username || prev.username,
        first_name: data.user?.first_name || prev.first_name,
        last_name: data.user?.last_name || prev.last_name,
        email: data.user?.email || prev.email,
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
        biography: data.profile.biography || "",
        birth_date: data.profile.birth_date
          ? String(data.profile.birth_date).slice(0, 10)
          : "",
        city: data.profile.city || "",
        neighborhood: data.profile.neighborhood || "",
        gps_consent: Boolean(data.profile.gps_consent),
        latitude:
          data.profile.latitude !== null && data.profile.latitude !== undefined
            ? String(data.profile.latitude)
            : "",
        longitude:
          data.profile.longitude !== null && data.profile.longitude !== undefined
            ? String(data.profile.longitude)
            : "",
        tags: Array.isArray(data.profile.tags) ? data.profile.tags : prev.tags,
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : prev.photos,
      }));

      if (data.user) {
        const nextUser = {
          ...(currentUser || {}),
          ...data.user,
        };
        writeStoredUser(nextUser);
        if (typeof onProfileUpdate === "function") {
          onProfileUpdate(nextUser);
        }
      }

      setMessage("Success: profile updated");
      if (data?.user?.profile_completed) {
        setTimeout(() => {
          navigate("/find-match");
        }, 400);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <FiUser size={20} aria-hidden="true" />
          <span>Your details</span>
        </h2>
      </div>

      {currentUser && (
        <p className="text-sm text-slate-500">
          @{currentUser.username} · {currentUser.email}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <FiUser size={13} aria-hidden="true" />
                  <span>Username<span className="text-red-600">*</span></span>
                </span>
              </label>
              <input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <FiCalendar size={13} aria-hidden="true" />
                  <span>Birth date<span className="text-red-600">*</span></span>
                </span>
              </label>
              <input
                name="birth_date"
                type="date"
                value={form.birth_date}
                onChange={handleChange}
                className={inputClass}
                max={todayIso}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <FiUser size={13} aria-hidden="true" />
                  <span>First name<span className="text-red-600">*</span></span>
                </span>
              </label>
              <input
                name="first_name"
                placeholder="First name"
                value={form.first_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <FiUser size={13} aria-hidden="true" />
                  <span>Last name<span className="text-red-600">*</span></span>
                </span>
              </label>
              <input
                name="last_name"
                placeholder="Last name"
                value={form.last_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <FiMail size={13} aria-hidden="true" />
                <span>Email address<span className="text-red-600">*</span></span>
              </span>
            </label>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                readOnly
                className={`${inputClass} bg-slate-50 text-slate-600`}
              />
              <button
                type="button"
                onClick={() => setEmailChangeOpen((prev) => !prev)}
                className={secondaryButtonClass}
              >
                Modify
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Email can only be changed after password confirmation and new-email verification.
            </p>
            {emailChangeOpen && (
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  name="new_email"
                  type="email"
                  placeholder="New email"
                  value={emailChangeForm.new_email}
                  onChange={handleEmailChangeInput}
                  className={inputClass}
                />
                <input
                  name="password"
                  type="password"
                  placeholder="Current password"
                  value={emailChangeForm.password}
                  onChange={handleEmailChangeInput}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEmailChangeSubmit}
                    className={primaryButtonClass}
                    disabled={emailChangeLoading}
                  >
                    {emailChangeLoading ? "Sending..." : "Send verification email"}
                  </button>
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => {
                      setEmailChangeOpen(false);
                      setEmailChangeForm({ new_email: "", password: "" });
                    }}
                    disabled={emailChangeLoading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <FiUser size={13} aria-hidden="true" />
                <span>Gender<span className="text-red-600">*</span></span>
              </span>
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Select gender</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="non_binary">non_binary</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <FiCompass size={13} aria-hidden="true" />
                <span>Sexual preference</span>
              </span>
            </label>
            <select
              name="sexual_preference"
              value={form.sexual_preference}
              onChange={handleChange}
              className={selectClass}
            >
              <option value="">Select sexual preference</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="both">both</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <FiInfo size={13} aria-hidden="true" />
                <span>Biography</span>
              </span>
            </label>
            <textarea
              name="biography"
              placeholder="Biography"
              value={form.biography}
              onChange={handleChange}
              className={textareaClass}
              rows={4}
              maxLength={MAX_BIO_LENGTH}
            />
            <p className="text-xs text-slate-500 text-right">
              {(form.biography || "").length}/{MAX_BIO_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <FiImage size={13} aria-hidden="true" />
                  <span>Photos (max {MAX_PHOTOS_COUNT}, {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each)</span>
                </span>
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="text-xs text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {form.photos.map((photo, index) => (
                <div
                  key={`${photo.id || "new"}-${index}`}
                  className={`relative overflow-hidden rounded-xl border ${photo.is_primary ? "border-brand" : "border-slate-200"}`}
                >
                  <img
                    src={photo.data_url}
                    alt={`Upload ${index + 1}`}
                    className="h-32 w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-1 text-xs text-white">
                    <button
                      type="button"
                      onClick={() => setPrimaryPhoto(index)}
                      className="hover:underline"
                    >
                      {photo.is_primary ? "Primary" : "Set primary"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {form.photos.length === 0 && (
                <div className="col-span-2 sm:col-span-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No photos yet. Upload up to {MAX_PHOTOS_COUNT} images ({bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each, {bytesToKB(MAX_TOTAL_PHOTOS_SIZE_BYTES)}KB total).
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              <FiMapPin size={13} aria-hidden="true" />
              <span>Location<span className="text-red-600">*</span></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="gps_consent"
                checked={form.gps_consent}
                onChange={handleChange}
              />
              I consent to GPS-based location
            </label>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={useCurrentLocation}
              disabled={loadingGeo || !form.gps_consent}
            >
              <span className="inline-flex items-center gap-2">
                <FaLocationArrow className="text-slate-700" />
                {loadingGeo ? "Locating..." : "Use my position"}
              </span>
            </button>
            <span className="text-xs text-slate-500">
              Enable GPS consent to auto-fill your location.
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="relative flex gap-2">
                <input
                  name="city"
                  placeholder="City"
                  value={form.city}
                  onChange={handleCityInputChange}
                  onFocus={() => !isNeighborhoodSelected && setIsCitySuggestionsOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsCitySuggestionsOpen(false), 120);
                  }}
                  className={`${inputClass} flex-1 ${cityAutocompleteOptions.length > 0 ? "rounded-b-none" : ""} ${isNeighborhoodSelected ? "opacity-60" : ""}`}
                  autoComplete="new-password"
                  disabled={isNeighborhoodSelected}
                  required
                />
                
                {isNeighborhoodSelected && (
                  <button
                    type="button"
                    onClick={handleEditLocation}
                    className={secondaryButtonClass}
                  >
                    Edit
                  </button>
                )}

                {isCitySuggestionsOpen && cityAutocompleteOptions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-lg pointer-events-auto">
                    {cityAutocompleteOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          applyCitySuggestion(option);
                        }}
                        onClick={() => applyCitySuggestion(option)}
                        className="block w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(form.city || "").trim().length > 0 && !isNeighborhoodSelected && (
                <p className={`text-xs ${locationValidation?.city_exists ? "text-emerald-700" : "text-amber-700"}`}>
                  {validatingLocation
                    ? "Checking city..."
                    : locationValidation?.city_exists
                      ? "✓ City verified"
                      : "City not verified yet"}
                </p>
              )}
              
              {isNeighborhoodSelected && (
                <p className="text-xs text-emerald-700">
                  ✓ {form.city} - confirmed
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <select
                  name="neighborhood"
                  value={form.neighborhood}
                  onChange={handleChange}
                  className={`${selectClass} ${isCitySelected ? "" : "opacity-60 cursor-not-allowed"}`}
                  disabled={!isCitySelected || loadingNeighborhoods || neighborhoodByCityOptions.length === 0}
                >
                  <option value="">
                    {isCitySelected
                      ? "Select neighborhood (optional)"
                      : "Select a valid city first"}
                  </option>
                  {neighborhoodByCityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {!hasCityInput && (
                <p className="text-xs text-slate-500">
                  Enter a city first to unlock neighborhood.
                </p>
              )}

              {hasCityInput && !isCitySelected && (
                <p className="text-xs text-slate-500">
                  Confirm a valid city first to unlock neighborhood suggestions.
                </p>
              )}

              {isCitySelected && neighborhoodByCityOptions.length === 0 && (
                <p className="text-xs text-slate-500">
                  {loadingNeighborhoods
                    ? "Loading neighborhoods..."
                    : "No neighborhoods available yet for this city."}
                </p>
              )}

              {(form.neighborhood || "").trim().length > 0 && (
                <p className={`text-xs ${locationValidation?.neighborhood_exists ? "text-emerald-700" : "text-amber-700"}`}>
                  {validatingLocation
                    ? "Checking neighborhood..."
                    : locationValidation?.neighborhood_exists
                      ? "✓ Neighborhood verified"
                      : "Neighborhood not verified yet"}
                </p>
              )}

              {isCitySelected && !isNeighborhoodSelected && (
                <p className="text-xs text-slate-500">
                  Neighborhood is optional, but helps with better precision.
                </p>
              )}
            </div>
          </div>

          {locationValidation && (
            <p className={`text-xs ${locationValidation.is_valid ? "text-emerald-700" : "text-amber-700"}`}>
              {locationValidation.is_valid
                ? "Location exists. Save is enabled."
                : "Location not fully verified yet. Adjust city or neighborhood."}
            </p>
          )}

          {/* Latitude/Longitude UI hidden for now */}

          <div className="space-y-2">
            <label className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <FiTag size={14} aria-hidden="true" />
              <span>Interests (tags)</span>
            </label>
            <div className="flex gap-2">
              <select
                value={selectedTag}
                onChange={(event) => setSelectedTag(event.target.value)}
                className={selectClass}
              >
                <option value="">Select an interest tag</option>
                {tagOptions.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => addTag(selectedTag)}
                className={secondaryButtonClass}
                disabled={!selectedTag || form.tags.length >= 10}
              >
                Add
              </button>
            </div>
            <p className="text-xs text-slate-500">{form.tags.length}/10 tags selected</p>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-xs px-3 py-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-white/80 hover:text-white"
                      aria-label={`Remove ${tag}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className={primaryButtonClass} disabled={!canAttemptSaveProfile}>
              Save Profile
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={loadProfile}
            >
              Reload Profile
            </button>
          </div>

          {!canSaveProfile && (
            <p className="text-xs text-amber-700">
              Save is locked. Required: {missingRequiredFields.join(", ") || "verified location"}.<br />
              <span className="text-xs text-slate-500">Fields marked with <span className="text-red-600">*</span> are required.</span>
            </p>
          )}
        </form>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}
      {(emailChangePreviewUrl || emailChangeDevVerifyUrl) && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {emailChangePreviewUrl && (
            <p>
              Ethereal preview: {' '}
              <a
                href={emailChangePreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-deep underline"
              >
                Open verification email
              </a>
            </p>
          )}
          {emailChangeDevVerifyUrl && (
            <p>
              Fallback verify link: {' '}
              <a
                href={emailChangeDevVerifyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-deep underline"
              >
                Verify directly in app
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const [currentUser, setCurrentUser] = useState(readStoredUser());
  const isProfileLocked = Boolean(currentUser && !currentUser.profile_completed);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    if (currentUser && location.pathname === "/login") {
      navigate(isProfileLocked ? "/profile" : "/find-match", { replace: true });
    }
  }, [currentUser, isProfileLocked, location.pathname, navigate]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return undefined;
    }

    function handleDocumentMouseDown(event) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    const onStorage = () => setCurrentUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function ensureRealtimeToken() {
      if (!currentUser?.id || currentUser?.realtime_token) {
        return;
      }

      try {
        const response = await fetch("/api/auth/realtime-token", {
          headers: buildApiHeaders(currentUser),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            realtime_token: payload.realtime_token,
          };
          writeStoredUser(next);
          return next;
        });
      } catch {
        // Keep app usable even if realtime token refresh fails temporarily.
      }
    }

    ensureRealtimeToken();

    return () => {
      cancelled = true;
    };
  }, [currentUser, currentUser?.id, currentUser?.realtime_token]);

  useEffect(() => {
    if (currentUser?.id && currentUser?.realtime_token) {
      connectRealtime(currentUser.id, currentUser.realtime_token);
      return () => {
        disconnectRealtime();
      };
    }

    disconnectRealtime();
    return undefined;
  }, [currentUser?.id, currentUser?.realtime_token]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;

    const socket = getRealtimeSocket();
    let cancelled = false;
    let refreshing = false;

    async function refreshRealtimeToken() {
      if (refreshing || cancelled) return;
      refreshing = true;

      try {
        const response = await fetch("/api/auth/realtime-token", {
          headers: buildApiHeaders({ id: currentUser.id }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.realtime_token || cancelled) {
          return;
        }

        setCurrentUser((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            realtime_token: payload.realtime_token,
          };
          writeStoredUser(next);
          return next;
        });

        connectRealtime(currentUser.id, payload.realtime_token);
      } catch {
        // Keep app usable and let polling continue if token refresh fails.
      } finally {
        refreshing = false;
      }
    }

    function onConnectError(error) {
      const message = String(error?.message || "");
      if (message.includes("Unauthorized")) {
        void refreshRealtimeToken();
      }
    }

    socket.on("connect_error", onConnectError);

    return () => {
      cancelled = true;
      socket.off("connect_error", onConnectError);
    };
  }, [currentUser?.id]);

  function logout() {
    setIsSettingsOpen(false);
    disconnectRealtime();
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    navigate("/login", { replace: true });
  }

  async function handleDeleteAccount() {
    if (!currentUser?.id) return;

    setIsSettingsOpen(false);
    const confirmed = window.confirm(
      "Delete your account permanently? This action cannot be undone.",
    );
    if (!confirmed) return;

    const password = window.prompt("Please enter your password to confirm:");
    if (password === null) return;

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: buildApiHeaders(
          { id: currentUser.id },
          { "Content-Type": "application/json" },
        ),
        body: JSON.stringify({ password, email: currentUser.email || "" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || "Failed to delete account.");
        return;
      }

      window.alert("Your account has been deleted.");
      logout();
    } catch {
      window.alert("Network error while deleting account.");
    }
  }

  return (
    <NotificationsProvider currentUser={currentUser}>
      {currentUser && !isLoginPage && (
        <div className="fixed inset-x-0 top-4 z-[9999] pointer-events-none">
          <div className="mx-auto flex max-w-5xl justify-end px-5 sm:px-6 lg:px-8">
            <div className="pointer-events-auto relative flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50/95 p-2 shadow-lg shadow-orange-200/60 backdrop-blur">
              <NotificationsBell />
              <ChatIndicator currentUser={currentUser} />
              <div ref={settingsMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/80 text-slate-700 hover:bg-white"
                  aria-label="Open settings menu"
                  title="Settings"
                >
                  <FiSettings size={18} />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate("/profile");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <FiUser size={15} aria-hidden="true" />
                      <span>My profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate("/blocked-users");
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <FiSlash size={15} aria-hidden="true" />
                      <span>Blocked users</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate("/messages");
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <FiMessageCircle size={15} aria-hidden="true" />
                      <span>Messages</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      <FiTrash2 size={15} aria-hidden="true" />
                      <span>Delete account</span>
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      <FiLogOut size={15} aria-hidden="true" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-brand-deep font-semibold">
            42 Matchmaking Playground
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 leading-none">
            Matcha
          </h1>
          <p className="text-slate-600">
            Clean routes, clear session flow, no fake current user.
          </p>
        </header>

        <TopNav currentUser={currentUser} profileLocked={isProfileLocked} />

      <Routes>
        <Route
          path="/"
          element={<Navigate to={currentUser ? (isProfileLocked ? "/profile" : "/find-match") : "/login"} replace />}
        />
        <Route path="/login" element={<LoginPage onLogin={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verification-sent" element={<VerificationSentPage />} />
        <Route path="/resend-verification" element={<ResendVerificationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/profile"
          element={
            currentUser ? (
              <ProfilePage
                currentUser={currentUser}
                onUnauthorized={() => {}}
                onProfileUpdate={setCurrentUser}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/find-match"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <FindMatchPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/popularity"
          element={<Navigate to="/popularity/views" replace />}
        />
        <Route
          path="/popularity/views"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <PopularityListPage currentUser={currentUser} mode="views" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/popularity/likes"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <PopularityListPage currentUser={currentUser} mode="likes" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/popularity/matches"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <PopularityListPage currentUser={currentUser} mode="matches" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/blocked-users"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <BlockedUsersPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <MessagesPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <MessagesPage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <UserProfilePage currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </main>
    <footer className="mt-16 border-t border-slate-100 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">

        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Matcha — 42 Dating Playground
        </p>
      </div>
    </footer>
    </NotificationsProvider>
  );
}

export default App;
