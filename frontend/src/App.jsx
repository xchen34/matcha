import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FaLocationArrow } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";
import UserCard from "./components/UserCard";
import FindMatchPage from "./pages/FindMatchPage";
import BlockedUsersPage from "./pages/BlockedUsersPage";
import PopularityListPage from "./pages/PopularityListPage";
import UserProfilePage from "./pages/UserProfilePage";
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
const STORAGE_KEY = "matcha.currentUser";

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

function TopNav({ currentUser }) {
  const { attentionBadges = {} } = useNotifications();

  const withDot = (label, active) => (
    <span className="inline-flex items-center gap-1">
      {label}
      {active && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="New activity" />}
    </span>
  );

  return (
    <nav className="flex flex-wrap items-center gap-3">
      {!currentUser && (
        <NavLink to="/login" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          Login
        </NavLink>
      )}
      {!currentUser && (
        <NavLink to="/register" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900  border-slate-900" : ""}`
        }>
          Create Account
        </NavLink>
      )}
      {currentUser && (
        <NavLink to="/find-match" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          Find your match
        </NavLink>
      )}
      {currentUser && (
        <NavLink to="/popularity/views" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          {withDot("Who viewed me", attentionBadges.views)}
        </NavLink>
      )}
      {currentUser && (
        <NavLink to="/popularity/likes" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          {withDot("Who liked me", attentionBadges.likes)}
        </NavLink>
      )}
      {currentUser && (
        <NavLink to="/popularity/matches" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          {withDot("Who matched with me", attentionBadges.matches)}
        </NavLink>
      )}
    </nav>
  );
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
    birth_date: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Submitting...");

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
      setMessage("Success: account created, please login.");
      setTimeout(() => navigate("/login"), 700);
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
          />
          <p className="text-xs text-slate-500">This is the public name visible to other users.</p>
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
          <input
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
          <p className="text-xs text-slate-500">Avoid common passwords and use a secure one.</p>
        </div>
        <button type="submit" className={primaryButtonClass}>
          Register
        </button>
        <p className="text-xs text-slate-500">You must be at least 18 years old.</p>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
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
        setMessage(`Error: ${data.error || "Login failed"}`);
        return;
      }

      persistUser(data.user);
      onLogin(data.user);
      setMessage(`Success: welcome ${data.user.username}`);
      setTimeout(() => navigate("/find-match"), 400);
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
            Username
          </label>
          <input
            name="username"
            placeholder="Enter your username"
            value={form.username}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
            Password
          </label>
          <input
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <button type="submit" className={primaryButtonClass}>
          Login
        </button>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}

function ProfilePage({ currentUser, onProfileUpdate }) {
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    biography: "",
    gender: "",
    sexual_preference: "",
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
  const hasManualLocationInput =
    (form.city || "").trim().length > 0 ||
    (form.neighborhood || "").trim().length > 0;
  const hasCityInput = (form.city || "").trim().length > 0;
  const hasNeighborhoodInput = (form.neighborhood || "").trim().length > 0;
  const hasBiography = (form.biography || "").trim().length > 0;
  const hasGender = (form.gender || "").trim().length > 0;
  const hasSexualPreference = (form.sexual_preference || "").trim().length > 0;
  const hasProfilePhoto = form.photos.length > 0;
  const hasPrimaryProfilePhoto = form.photos.some((photo) => photo.is_primary);
  const hasRequiredFields =
    hasBiography &&
    hasGender &&
    hasSexualPreference &&
    hasManualLocationInput &&
    hasProfilePhoto &&
    hasPrimaryProfilePhoto;
  const missingRequiredFields = [
    !hasBiography ? "biography" : null,
    !hasGender ? "gender" : null,
    !hasSexualPreference ? "sexual preference" : null,
    !hasManualLocationInput ? "city or neighborhood" : null,
    !hasProfilePhoto ? "profile photo" : null,
    hasProfilePhoto && !hasPrimaryProfilePhoto ? "primary profile photo" : null,
  ].filter(Boolean);
  const isLocationAccepted =
    Boolean(locationValidation?.is_valid) ||
    (isCityConfirmed && !hasNeighborhoodInput);

  const canSaveProfile =
    !loading &&
    !validatingLocation &&
    isLocationAccepted &&
    hasRequiredFields;
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
        console.log("[city-suggestions] response", {
          city,
          status: response.status,
          ok: response.ok,
          count: Array.isArray(data?.suggestions) ? data.suggestions.length : 0,
          sample: Array.isArray(data?.suggestions)
            ? data.suggestions.slice(0, 3).map((item) => item.city)
            : [],
        });
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
      } catch (error) {
        console.log("[city-suggestions] failed", {
          city,
          message: error?.message || "unknown error",
        });
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
        biography: data.profile.biography || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
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

      console.log("[validate-location] response", {
        city,
        neighborhood,
        status: response.status,
        ok: response.ok,
        validation: data?.validation || null,
        suggestionsCount: Array.isArray(data?.suggestions) ? data.suggestions.length : 0,
      });

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
      biography: form.biography,
      gender: form.gender,
      sexual_preference: form.sexual_preference,
      birth_date: form.birth_date || null,
      city: form.city,
      neighborhood: form.neighborhood,
      gps_consent: form.gps_consent,
      latitude: form.latitude,
      longitude: form.longitude,
      tags: form.tags,
      photos: form.photos,
    };

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
        biography: data.profile.biography || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
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
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.14em] text-brand-deep font-semibold">
          Profile
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">Your details</h2>
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
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Account
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                Username
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
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                First name
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
                Last name
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
              Email address
            </label>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Biography
            </label>
            <textarea
              name="biography"
              placeholder="Biography"
              value={form.biography}
              onChange={handleChange}
              className={textareaClass}
              rows={4}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Gender
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
              Sexual preference
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
                Photos (max {MAX_PHOTOS_COUNT}, {bytesToKB(MAX_PHOTO_SIZE_BYTES)}KB each)
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
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
              Location
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
            <label className="text-sm font-medium text-slate-700">Interests (tags)</label>
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
            <button type="submit" className={primaryButtonClass} disabled={!canSaveProfile}>
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
              Save is locked. Required: {missingRequiredFields.join(", ") || "verified location"}.
            </p>
          )}
        </form>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const [currentUser, setCurrentUser] = useState(readStoredUser());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    if (currentUser && location.pathname === "/login") {
      navigate("/find-match", { replace: true });
    }
  }, [currentUser, location.pathname, navigate]);

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

  return (
    <NotificationsProvider currentUser={currentUser}>
      {currentUser && !isLoginPage && (
        <div className="fixed inset-x-0 top-4 z-[9999] pointer-events-none">
          <div className="mx-auto flex max-w-5xl justify-end px-5 sm:px-6 lg:px-8">
            <div className="pointer-events-auto relative flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50/95 p-2 shadow-lg shadow-orange-200/60 backdrop-blur">
              <NotificationsBell />
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
                      className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      My profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        navigate("/blocked-users");
                      }}
                      className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    >
                      Blocked users
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                    >
                      Log out
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

        <TopNav currentUser={currentUser} />

      <Routes>
        <Route
          path="/"
          element={<Navigate to={currentUser ? "/find-match" : "/login"} replace />}
        />
        <Route path="/login" element={<LoginPage onLogin={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage />} />
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
          element={<FindMatchPage currentUser={currentUser} />}
        />
        <Route
          path="/popularity"
          element={<Navigate to="/popularity/views" replace />}
        />
        <Route
          path="/popularity/views"
          element={<PopularityListPage currentUser={currentUser} mode="views" />}
        />
        <Route
          path="/popularity/likes"
          element={<PopularityListPage currentUser={currentUser} mode="likes" />}
        />
        <Route
          path="/popularity/matches"
          element={<PopularityListPage currentUser={currentUser} mode="matches" />}
        />
        <Route
          path="/blocked-users"
          element={<BlockedUsersPage currentUser={currentUser} />}
        />
        <Route
          path="/users/:id"
          element={<UserProfilePage currentUser={currentUser} />}
        />
      </Routes>
    </main>
    </NotificationsProvider>
  );
}

export default App;
