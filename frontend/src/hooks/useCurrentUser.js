import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { buildApiHeaders } from "../utils.js";
import { disconnectRealtime } from "../realtime/socket.js";
import {
  clearStoredUser,
  readStoredUser,
  writeStoredUser,
  STORAGE_KEY,
} from "../utils/userStorage.js";

export function useCurrentUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(readStoredUser());

  const isProfileLocked = Boolean(
    currentUser && !currentUser.profile_completed,
  );
  const isLoginPage = location.pathname === "/login";

  // Redirect logged-in users away from login page
  useEffect(() => {
    if (currentUser && isLoginPage) {
      navigate(isProfileLocked ? "/profile" : "/find-match", { replace: true });
    }
  }, [currentUser, isProfileLocked, isLoginPage, navigate]);

  // Sync storage across tabs/windows
  useEffect(() => {
    const onStorage = () => setCurrentUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Validate the cached session against the backend
  useEffect(() => {
    let cancelled = false;

    async function validateStoredSession() {
      if (!currentUser?.id) {
        return;
      }

      try {
        const response = await fetch("/api/profile/me", {
          headers: buildApiHeaders(currentUser),
        });

        if (cancelled) {
          return;
        }

        if (response.ok) {
          return;
        }

        if ([401, 403, 404].includes(response.status)) {
          disconnectRealtime();
          clearStoredUser();
          setCurrentUser(null);
          if (location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
      } catch {
        // Keep the cached session if the backend is temporarily unreachable.
      }
    }

    void validateStoredSession();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, location.pathname, navigate]);

  function logout() {
    // Notify backend and disconnect realtime immediately
    console.log("[useCurrentUser] logout: calling disconnectRealtime");
    disconnectRealtime();

    // Try to notify the backend (fire-and-forget)
    if (currentUser?.id) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: buildApiHeaders(currentUser, {
          "Content-Type": "application/json",
        }),
      }).catch(() => {
        // ignore errors - logout succeeds even if API call fails
      });
    }

    // Clear local state
    clearStoredUser();
    setCurrentUser(null);
    navigate("/login", { replace: true });
  }

  async function handleDeleteAccount() {
    if (!currentUser?.id) return;

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

  return {
    currentUser,
    setCurrentUser,
    isProfileLocked,
    logout,
    handleDeleteAccount,
  };
}
