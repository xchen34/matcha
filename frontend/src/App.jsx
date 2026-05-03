import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FiLogOut, FiMessageCircle, FiSettings, 
  FiSlash, FiTrash2, FiUser} from "react-icons/fi";

// Components
import TopNav from "./components/TopNav.jsx";
import MessagesBloc from "./components/MessagesBloc.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import UserCard from "./components/UserCard";
import BlockedUsers from "./components/BlockedUsers";

// Matching
import FindMatchPage from "./matching/FindMatchPage";

// Chat
import ChatIndicator from "./chat/components/ChatIndicator.jsx";

// Popularity
import PopularityListPage from "./popularity/PopularityListPage";

// Auth
import ForgotPasswordPage from "./auth/ForgotPasswordPage.jsx";
import LoginPage from "./auth/LoginPage.jsx";
import RegisterPage from "./auth/RegisterPage.jsx";
import ResendVerificationPage from "./auth/ResendVerificationPage.jsx";
import ResetPasswordPage from "./auth/ResetPasswordPage.jsx";
import VerifyEmailPage from "./auth/VerifyEmailPage.jsx";
import VerificationSentPage from "./auth/VerificationSentPage.jsx";

// Profile
import ProfilePage from "./profile/me/ProfilePage.jsx";
import UserProfilePage from "./profile/user/UserProfilePage";

// Notifications
import { NotificationsProvider } from "./notifications/NotificationsProvider.jsx";
import NotificationsBell from "./notifications/NotificationsBell.jsx";

// Realtime
import { connectRealtime, disconnectRealtime, getRealtimeSocket } from "./realtime/socket.js";

// Utils
import { buildApiHeaders } from "./utils.js";
import { readStoredUser, writeStoredUser, STORAGE_KEY } from "./utils/userStorage.js";

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
              <BlockedUsers currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <MessagesBloc currentUser={currentUser} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages/:conversationId"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <MessagesBloc currentUser={currentUser} />
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
