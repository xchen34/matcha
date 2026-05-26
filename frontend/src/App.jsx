import { Navigate, Route, Routes } from "react-router-dom";

// Hooks
import { useCurrentUser } from "./hooks/useCurrentUser.js";
import { useRealtimeConnection } from "./hooks/useRealtimeConnection.js";
import { useSettings } from "./hooks/useSettings.js";

// Components
import { TopHeaderNav } from "./components/TopHeaderNav.jsx";
import AuthHeaderNav from "./components/AuthHeaderNav.jsx"
import MessagesBloc from "./components/MessagesBloc.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import BlockedUsers from "./components/BlockedUsers";
import NotFoundPage from "./components/NotFoundPage.jsx";

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
  const { currentUser, setCurrentUser, isProfileLocked, logout, handleDeleteAccount } = useCurrentUser();
  const { isSettingsOpen, setIsSettingsOpen, settingsMenuRef, navigateTo } = useSettings();

  useRealtimeConnection(currentUser, setCurrentUser);  

  return (
    <NotificationsProvider currentUser={currentUser}>
      <div className="min-h-screen flex flex-col">
        {/* ========== Header navigation based on authentication status ========== */}
        {currentUser ? (
          <TopHeaderNav
            currentUser={currentUser}
            profileLocked={isProfileLocked}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            settingsMenuRef={settingsMenuRef}
            navigateTo={navigateTo}
            logout={logout}
            handleDeleteAccount={handleDeleteAccount}
          />
        ) : (
          <AuthHeaderNav navigateTo={navigateTo} />
        )}

        <main className="max-w-5xl mx-auto px-5 py-10 space-y-10">
          {/* ========== Main header ========== */}
          <header className="flex flex-col">
            <h1 className="mt-10 -ml-1 text-5xl sm:text-6xl font-bold text-primary leading-none font-jersey tracking-wider">
              MATCHA
            </h1>
            <p className="-mt-1 text-xs tracking-[0.16em] text-primary-dark font-semibold">
              Match! Match! Matcha!
            </p>
          </header>
          
          {/* ========== Application routes ========== */}
          <Routes>
            {/* AUTHENTICATION ROUTES  */}
            <Route
              path="/"
              element={<Navigate to={currentUser ? (isProfileLocked ? "/profile" : "/find-match") : "/login"} replace />}
            />
            <Route path="/login" element={<LoginPage onLogin={setCurrentUser} />} />  //Element is to define what component to render when the user navigates to the /login route, onLogin is the function to update the user in the parent component.Route is to define a route to a component.
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
                    onUnauthorized={() => { }}
                    onProfileUpdate={setCurrentUser}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* FIND MATCH ROUTE */}
            <Route
              path="/find-match"
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <FindMatchPage currentUser={currentUser} />
                </ProtectedRoute>
              }
            />

            {/* POPULARITY ROUTES (views, likes, matches) */}
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
            
            {/* BLOCKED USERS*/}
            <Route
              path="/blocked-users"
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <BlockedUsers currentUser={currentUser} />
                </ProtectedRoute>
              }
            />

            {/* MESSAGES ROUTES*/}
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

            {/* USER PROFILE ROUTE */}
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <UserProfilePage currentUser={currentUser} />
                </ProtectedRoute>
              }
            />

            {/* 404 NOT FOUND */}
            <Route path="*" element={<NotFoundPage currentUser={currentUser} />} />
          </Routes>
        </main>

        {/* ========== Footer ========== */}
        <footer className="border-t border-slate-100 bg-white/80 backdrop-blur mt-auto">
          <div className="mx-auto max-w-5xl px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} Matcha — 42 Dating Playground
            </p>
          </div>
        </footer>
      </div>

    </NotificationsProvider>
  );
}

export default App;
