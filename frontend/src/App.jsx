import { useCallback, useEffect, useState } from "react";
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

function ProfilePage({ currentUser, onUnauthorized }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    biography: "",
    gender: "",
    sexual_preference: "",
    city: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const userId= currentUser?.id ?? null;
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
      });
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate, onUnauthorized]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Submitting...");

    // Ajout du log pour debug
    console.log("handleSubmit userId:", userId);
    const headers = buildApiHeaders({ id: userId }, {
      "Content-Type": "application/json",
    });
    console.log("handleSubmit headers:", headers);

    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers,
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Update failed"}`);

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
      });
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

          <input
            name="city"
            placeholder="City"
            value={form.city}
            onChange={handleChange}
            className={inputClass}
          />

          <div className="flex items-center gap-3">
            <button type="submit" className={primaryButtonClass}>
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
