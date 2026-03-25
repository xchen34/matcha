import { useCallback, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";

const STORAGE_KEY = "matcha.currentUser";

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

function buildApiHeaders(currentUser, extraHeaders = {}) {
  const headers = { ...extraHeaders };

  if (currentUser?.id) {
    headers["x-user-id"] = String(currentUser.id);
  }

  return headers;
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
    <section className="card">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
        />
        <input
          name="first_name"
          placeholder="First name"
          value={form.first_name}
          onChange={handleChange}
        />
        <input
          name="last_name"
          placeholder="Last name"
          value={form.last_name}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit">Register</button>
      </form>
      {message && <p className="message">{message}</p>}
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
    <section className="card">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <button type="submit">Login</button>
      </form>
      {message && <p className="message">{message}</p>}
    </section>
  );
}

// function ProfilePage({ onUnauthorized }) {
function ProfilePage({ currentUser, onUnauthorized }) {
  const navigate = useNavigate();
  // const [profileUser, setProfileUser] = useState(readStoredUser());
  const [form, setForm] = useState({
    biography: "",
    gender: "",
    sexual_preference: "",
    city: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  // const userId = profileUser?.id ?? null;
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
          // onUnauthorized();
          // setProfileUser(null);
          // navigate("/login");

          setMessage("Not authorized. Please login again if needed.");
          // Do not logout or navigate automatically
        }

        return;
      }

      // setProfileUser(data.user); // plus utilisé, remplacé par currentUser
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

      // setProfileUser(data.user); // plus utilisé, remplacé par currentUser
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
    <section className="card">
      <h2>Profile</h2>
      {currentUser && (
        <p className="muted">
          Username: @{currentUser.username} · Email: {currentUser.email}
        </p>
      )}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <textarea
            name="biography"
            placeholder="Biography"
            value={form.biography}
            onChange={handleChange}
            rows={4}
          />

          <select name="gender" value={form.gender} onChange={handleChange}>
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
          />

          <button type="submit">Save Profile</button>
        </form>
      )}

      <button type="button" className="secondary" onClick={loadProfile}>
        Reload Profile
      </button>
      {message && <p className="message">{message}</p>}
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
    <main className="page">
      <header className="hero">
        <p className="eyebrow">42 Matchmaking Playground</p>
        <h1>Matcha</h1>
        <p className="sub">Clean routes, clear session flow, no fake current user.</p>
      </header>

      <nav className="nav">
        {!currentUser && <NavLink to="/login">Login</NavLink>}
        {!currentUser && <NavLink to="/register">Create Account</NavLink>}
        {currentUser && <NavLink to="/profile">My Profile</NavLink>}
        {currentUser && (
          <button type="button" className="secondary" onClick={logout}>
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
              // <ProfilePage onUnauthorized={logout} />
              // <ProfilePage onUnauthorized={() => {}} />
              <ProfilePage currentUser={currentUser} onUnauthorized={() => {}} />

            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </main>
  );
}

export default App;
