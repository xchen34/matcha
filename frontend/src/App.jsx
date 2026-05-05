import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// Hooks
import { useCurrentUser } from "./hooks/useCurrentUser.js";
import { useRealtimeConnection } from "./hooks/useRealtimeConnection.js";
import { useSettings } from "./hooks/useSettings.js";

// Components
import TopNav from "./components/TopNav.jsx";
import { HeaderBar } from "./components/HeaderBar.jsx";
import MessagesBloc from "./components/MessagesBloc.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import BlockedUsers from "./components/BlockedUsers";

// Matching
import FindMatchPage from "./matching/FindMatchPage";

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

function App() {
  const location = useLocation();
  const { currentUser, setCurrentUser, isProfileLocked, logout, handleDeleteAccount } = useCurrentUser();
  const isLoginPage = location.pathname === "/login";
  
  useRealtimeConnection(currentUser, setCurrentUser);
  
  const { isSettingsOpen, setIsSettingsOpen, settingsMenuRef, navigateTo } = useSettings();

  return (
    <NotificationsProvider currentUser={currentUser}>
      <HeaderBar 
        currentUser={currentUser}
        isLoginPage={isLoginPage}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        settingsMenuRef={settingsMenuRef}
        navigateTo={navigateTo}
        logout={logout}
        handleDeleteAccount={handleDeleteAccount}
      />
      
      <main className="max-w-5xl mx-auto px-5 py-10 space-y-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-primary-dark font-semibold">
            42 Matchmaking Playground
          </p>
          <h1 className="text-5xl sm:text-6xl font-bold text-neutral-dark leading-none">
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
