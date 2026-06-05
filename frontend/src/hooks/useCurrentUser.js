import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { disconnectRealtime } from "@/realtime/socket.js";
import { buildApiHeaders } from "@/utils/utils.js";
import { clearStoredUser, readStoredUser } from "@/utils/userStorage.js";


export function useCurrentUser() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize currentUser state from localStorage (if available).
  const [currentUser, setCurrentUser] = useState(readStoredUser());

  // Determine if the user's profile is locked (incomplete)
  const isProfileLocked = Boolean(
    currentUser && !currentUser.profile_completed,
  );

  // Check if the current page is the login page
  const isLoginPage = location.pathname === "/login";

  /* ========== Redirect logic on user state change ========== */
  useEffect(() => {
    if (currentUser && isLoginPage) {
      navigate(isProfileLocked ? "/profile" : "/find-match", { replace: true });
    }
  }, [currentUser, isProfileLocked, isLoginPage, navigate]);

  /* ========== Sync user state across tabs ========== */
  useEffect(() => {
    const onStorage = () => setCurrentUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ========== Validate the cached session against the backend ========== */
  useEffect(() => {
    let cancelled = false;

    async function validateStoredSession() {
      if (!currentUser?.id) return;

      try {
        // Try to fetch the user's profile to validate the session.
        const response = await fetch("/api/profile/me", {
          headers: buildApiHeaders(currentUser),
        });

        if (cancelled) return;
        if (response.ok) return;

        // Token is invalid or expired
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

  /* ========== Logout function ========== */
  function logout() {
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

  /* ========== Delete account ========== */
  async function handleDeleteAccount(password) {
    if (!currentUser?.id) return;
    if (typeof password !== "string" || password.length === 0) {
      return { ok: false, error: "Password is required." };
    }

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: buildApiHeaders(currentUser, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ password, email: currentUser.email || "" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, error: data.error || "Failed to delete account." };
      }

      logout();
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error while deleting account." };
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
