import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { writeStoredUser } from "@/utils/userStorage.js";

export function useLogin(onLogin) {
  const navigate = useNavigate(); 

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("Submitting...");

    try {
      const loginPayload = {
        ...form,
        username: (form.username || "").includes("@")
          ? (form.username || "").trim().toLowerCase()
          : (form.username || "").trim(),
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data?.requires_email_verification) {
          const fallbackEmail =
            (typeof data?.email === "string" &&
              data.email.trim().toLowerCase()) ||
            ((form.username || "").includes("@")
              ? (form.username || "").trim().toLowerCase()
              : "");

          setMessage("Email not verified...");

          setTimeout(() => {
            navigate("/resend-verification", {
              state: { prefillEmail: fallbackEmail },
            });
          }, 400);

          return;
        }
        return setMessage(`Error: ${data.error || "Login failed"}`);
      }

      writeStoredUser(data.user);
      onLogin(data.user);

      setMessage(`Welcome ${data.user.username}`);

      const nextPath = data?.user?.profile_completed
        ? "/find-match"
        : "/profile";

      setTimeout(() => navigate(nextPath), 400);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  }

  return {
    form,
    message,
    handleChange,
    handleSubmit,
  };
}
