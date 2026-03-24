import { useState } from "react";
import "./App.css";

function App() {
  const [registerForm, setRegisterForm] = useState({
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  const [registerMessage, setRegisterMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");

  function handleRegisterChange(event) {
    const { name, value } = event.target;
    setRegisterForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setRegisterMessage("Submitting...");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterMessage(`Error: ${data.error || "Register failed"}`);
        return;
      }

      setRegisterMessage(`Success: ${data.message}`);
    } catch (error) {
      setRegisterMessage(`Error: ${error.message}`);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginMessage("Submitting...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginMessage(`Error: ${data.error || "Login failed"}`);
        return;
      }

      setLoginMessage(`Success: welcome ${data.user.username}`);
    } catch (error) {
      setLoginMessage(`Error: ${error.message}`);
    }
  }

  return (
    <main className="page">
      <h1>Matcha Auth</h1>

      <section className="card">
        <h2>Register</h2>
        <form onSubmit={handleRegisterSubmit}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={registerForm.email}
            onChange={handleRegisterChange}
          />
          <input
            name="username"
            placeholder="Username"
            value={registerForm.username}
            onChange={handleRegisterChange}
          />
          <input
            name="first_name"
            placeholder="First name"
            value={registerForm.first_name}
            onChange={handleRegisterChange}
          />
          <input
            name="last_name"
            placeholder="Last name"
            value={registerForm.last_name}
            onChange={handleRegisterChange}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={registerForm.password}
            onChange={handleRegisterChange}
          />
          <button type="submit">Register</button>
        </form>
        {registerMessage && <p className="message">{registerMessage}</p>}
      </section>

      <section className="card">
        <h2>Login</h2>
        <form onSubmit={handleLoginSubmit}>
          <input
            name="username"
            placeholder="Username"
            value={loginForm.username}
            onChange={handleLoginChange}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={handleLoginChange}
          />
          <button type="submit">Login</button>
        </form>
        {loginMessage && <p className="message">{loginMessage}</p>}
      </section>
    </main>
  );
}

export default App;
