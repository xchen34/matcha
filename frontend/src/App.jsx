import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import UserCard from "./components/UserCard";
import FindMatchPage from "./pages/FindMatchPage";
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

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !Number.isInteger(parsed.id)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}


function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [message, setMessage] = useState("");

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
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className={inputClass}
        />
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className={inputClass}
        />
        <input
          name="first_name"
          placeholder="First name"
          value={form.first_name}
          onChange={handleChange}
          className={inputClass}
        />
        <input
          name="last_name"
          placeholder="Last name"
          value={form.last_name}
          onChange={handleChange}
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className={inputClass}
        />
        <button type="submit" className={primaryButtonClass}>
          Register
        </button>
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
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
      setTimeout(() => navigate("/profile"), 400);
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
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          className={inputClass}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className={inputClass}
        />
        <button type="submit" className={primaryButtonClass}>
          Login
        </button>
      </form>
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}

function ProfilePage({ currentUser }) {
  const [form, setForm] = useState({
    biography: "",
    gender: "",
    sexual_preference: "",
    city: "",
    neighborhood: "",
    gps_consent: false,
    latitude: "",
    longitude: "",
    tags: [],
  });
  
  const [selectedTag, setSelectedTag] = useState("");
  const [tagOptions, setTagOptions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationValidation, setLocationValidation] = useState(null);
  const [selectedCitySuggestionKey, setSelectedCitySuggestionKey] = useState("");
  const [selectedNeighborhoodSuggestionKey, setSelectedNeighborhoodSuggestionKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [validatingLocation, setValidatingLocation] = useState(false);
  const userId = currentUser?.id ?? null;
  const hasManualLocationInput =
    (form.city || "").trim().length > 0 ||
    (form.neighborhood || "").trim().length > 0;
  const canSaveProfile =
    !loading &&
    !validatingLocation &&
    Boolean(locationValidation?.is_valid) &&
    hasManualLocationInput;

  function buildSuggestionKey(suggestion) {
    return `${suggestion.display_name}-${suggestion.latitude}-${suggestion.longitude}`;
  }

  const citySuggestionOptions = useMemo(() => {
    return locationSuggestions
      .filter((item) => (item.city || "").trim().length > 0)
      .map((item) => ({
        key: buildSuggestionKey(item),
        city: item.city,
        neighborhood: item.neighborhood || "",
        label: item.display_name,
      }));
  }, [locationSuggestions]);

  const neighborhoodSuggestionOptions = useMemo(() => {
    return locationSuggestions
      .filter((item) => (item.neighborhood || "").trim().length > 0)
      .map((item) => ({
        key: buildSuggestionKey(item),
        city: item.city || "",
        neighborhood: item.neighborhood,
        label: item.display_name,
      }));
  }, [locationSuggestions]);

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
        biography: data.profile.biography || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
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
      });
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (
      name === "city" ||
      name === "neighborhood" ||
      name === "latitude" ||
      name === "longitude" ||
      name === "gps_consent"
    ) {
      setLocationValidation(null);
      setLocationSuggestions([]);
      setSelectedCitySuggestionKey("");
      setSelectedNeighborhoodSuggestionKey("");
    }
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
            setLocationValidation(null);
            setLocationSuggestions([]);
            setSelectedCitySuggestionKey("");
            setSelectedNeighborhoodSuggestionKey("");
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

  async function validateLocationInput(options = {}) {
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

    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (neighborhood) params.set("neighborhood", neighborhood);
    if (latitude) params.set("latitude", latitude);
    if (longitude) params.set("longitude", longitude);
    params.set("limit", "5");

    try {
      const response = await fetch(`/api/profile/validate-location?${params.toString()}`, {
        headers: buildApiHeaders({ id: userId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setLocationValidation(null);
        setLocationSuggestions([]);
        if (!silent) {
          setMessage(`Error: ${data.error || "Location verification failed"}`);
        }
        return;
      }

      setLocationValidation(data.validation || null);
      setLocationSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);

      if (data.validation?.is_valid) {
        if (!silent) {
          setMessage("Location verified. You can save safely.");
        }
      } else {
        if (!silent) {
          setMessage("Location needs confirmation. Choose a suggestion or adjust your input.");
        }
      }
    } catch (error) {
      setLocationValidation(null);
      setLocationSuggestions([]);
      if (!silent) {
        setMessage(`Error: ${error.message}`);
      }
    } finally {
      setValidatingLocation(false);
    }
  }

  function applyCitySuggestion(option) {
    setSelectedCitySuggestionKey(option.key);
    setForm((prev) => ({
      ...prev,
      city: option.city,
      neighborhood: prev.neighborhood || option.neighborhood,
    }));
    setMessage("City suggestion selected.");
  }

  function applyNeighborhoodSuggestion(option) {
    setSelectedNeighborhoodSuggestionKey(option.key);
    setForm((prev) => ({
      ...prev,
      neighborhood: option.neighborhood,
      city: prev.city || option.city,
    }));
    setMessage("Neighborhood suggestion selected.");
  }

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const city = (form.city || "").trim();
    const neighborhood = (form.neighborhood || "").trim();

    if (!city && !neighborhood) {
      setLocationValidation(null);
      setLocationSuggestions([]);
      return undefined;
    }

    const handle = setTimeout(() => {
      validateLocationInput({ silent: true });
    }, 450);

    return () => clearTimeout(handle);
  }, [
    userId,
    form.city,
    form.neighborhood,
    form.latitude,
    form.longitude,
    form.gps_consent,
  ]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!locationValidation?.is_valid) {
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
      biography: form.biography,
      gender: form.gender,
      sexual_preference: form.sexual_preference,
      city: form.city,
      neighborhood: form.neighborhood,
      gps_consent: form.gps_consent,
      latitude: form.latitude,
      longitude: form.longitude,
      tags: form.tags,
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
        biography: data.profile.biography || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
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
      }));
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            name="biography"
            placeholder="Biography"
            value={form.biography}
            onChange={handleChange}
            className={textareaClass}
            rows={4}
          />

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

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <input
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                className={inputClass}
              />

              {citySuggestionOptions.length > 0 && (
                <select
                  value={selectedCitySuggestionKey}
                  onChange={(event) => {
                    const option = citySuggestionOptions.find(
                      (item) => item.key === event.target.value,
                    );
                    if (option) {
                      applyCitySuggestion(option);
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">Suggestions for city (full address)</option>
                  {citySuggestionOptions.slice(0, 6).map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {(form.city || "").trim().length > 0 && (
                <p className={`text-xs ${locationValidation?.city_exists ? "text-emerald-700" : "text-amber-700"}`}>
                  {validatingLocation
                    ? "Checking city..."
                    : locationValidation?.city_exists
                      ? "City exists"
                      : "City not verified yet"}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <input
                name="neighborhood"
                placeholder="Neighborhood"
                value={form.neighborhood}
                onChange={handleChange}
                className={inputClass}
              />

              {neighborhoodSuggestionOptions.length > 0 && (
                <select
                  value={selectedNeighborhoodSuggestionKey}
                  onChange={(event) => {
                    const option = neighborhoodSuggestionOptions.find(
                      (item) => item.key === event.target.value,
                    );
                    if (option) {
                      applyNeighborhoodSuggestion(option);
                    }
                  }}
                  className={selectClass}
                >
                  <option value="">Suggestions for neighborhood (full address)</option>
                  {neighborhoodSuggestionOptions.slice(0, 6).map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}

              {(form.neighborhood || "").trim().length > 0 && (
                <p className={`text-xs ${locationValidation?.neighborhood_exists ? "text-emerald-700" : "text-amber-700"}`}>
                  {validatingLocation
                    ? "Checking neighborhood..."
                    : locationValidation?.neighborhood_exists
                      ? "Neighborhood exists"
                      : "Neighborhood not verified yet"}
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

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="gps_consent"
              checked={form.gps_consent}
              onChange={handleChange}
            />
            I consent to GPS-based location
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={useCurrentLocation}
              disabled={loadingGeo}
            >
              {loadingGeo ? "Locating..." : "Use current GPS location"}
            </button>
            <span className="text-xs text-slate-500">
              If disabled, city/neighborhood must be provided manually.
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              name="latitude"
              placeholder="Latitude"
              value={form.latitude}
              onChange={handleChange}
              className={inputClass}
            />
            <input
              name="longitude"
              placeholder="Longitude"
              value={form.longitude}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

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
              Save is locked until city or neighborhood is entered and verified.
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
  const [currentUser, setCurrentUser] = useState(readStoredUser());

  useEffect(() => {
    const onStorage = () => setCurrentUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    navigate("/login", { replace: true });
  }

  return (
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
          <NavLink to="/profile" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            My Profile
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
          <button type="button" className={secondaryButtonClass} onClick={logout}>
            Logout
          </button>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage onLogin={setCurrentUser} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/profile"
          element={
            currentUser ? (
              <ProfilePage currentUser={currentUser} onUnauthorized={() => {}} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/find-match"
          element={<FindMatchPage currentUser={currentUser} />}
        />
      </Routes>
    </main>
  );
}

export default App;
