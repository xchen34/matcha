import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import NotificationsBell from "../notifications/NotificationsBell.jsx";
import ChatIndicator from "../chat/components/ChatIndicator.jsx";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { Zap, Cog, User, Users, Eye, Heart, LogOut, Trash2, Ban, MessageSquareHeart } from "lucide-react";

export function TopHeaderNav({
  currentUser,
  profileLocked,
  isLoginPage,
  isSettingsOpen,
  setIsSettingsOpen,
  settingsMenuRef,
  navigateTo,
  logout,
  handleDeleteAccount
}) {
  const location = useLocation();
  const { attentionBadges = {}, clearAttentionMode } = useNotifications();

  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const prev = previousPathRef.current;

    if (prev === "/popularity/views") clearAttentionMode("views");
    else if (prev === "/popularity/likes") clearAttentionMode("likes");
    else if (prev === "/popularity/matches") clearAttentionMode("matches");

    previousPathRef.current = location.pathname;
  }, [location.pathname, clearAttentionMode]);

  const modeCounts = {
    views: Number(attentionBadges.views || 0),
    likes: Number(attentionBadges.likes || 0),
    matches: Number(attentionBadges.matches || 0),
  };

  const navItem = (icon, full, short, count, isActive) => (
    <span
      className={`relative inline-flex h-10 w-10 sm:w-auto items-center justify-center sm:justify-start rounded-full border px-0 sm:px-3 lg:px-4 transition-all duration-200 gap-0 sm:gap-1.5 ${
        isActive
          ? "border-primary bg-primary-medium text-white"
          : "border-primary/70 bg-white/40 text-neutral-dark hover:bg-primary-medium hover:text-white"
      }`}
    >
      {/* ICON */}
      <span
        className={`transition-colors ${
          isActive ? "text-white" : "text-[#f163cf] group-hover:text-white"
        }`}
      >
        {icon}
      </span>

      {/* TEXT */}
      <span
        className={`hidden sm:inline font-medium whitespace-nowrap transition-colors ${
          isActive ? "text-white" : "text-primary group-hover:text-white"
        }`}
      >
        <span className="lg:hidden text-[11px]">
          {short}
        </span>

        <span className="hidden lg:inline text-xs">
          {full}
        </span>
      </span>

      {/* BADGE */}
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] h-5 items-center justify-center border border-neutral-light rounded-full bg-error px-1 text-xs font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  if (!currentUser || isLoginPage) return null;

  return (
    <header className="fixed top-2 inset-x-0 z-50 flex justify-center px-2 sm:px-4">
      
      {/* CAPSULE */}
      <div className="w-full max-w-5xl flex items-center h-14 bg-white/70 backdrop-blur-xl border border-slate/60 shadow-md rounded-full px-2 gap-2 sm:gap-3">

        {/* LEFT */}
        <nav className="py-2 flex-1 flex flex-nowrap items-center gap-1 sm:gap-2 overflow-hidden">

          {profileLocked ? (
            <NavLink to="/profile" className="group">
              {({ isActive }) => navItem(<User size={18} />, "Complete Profile", "Profile", 0, isActive)}
            </NavLink>
          ) : (
            <>
              <NavLink to="/find-match" className="group">
                {({ isActive }) =>
                  navItem(<Users size={18} />, "Find my match", "Find", 0, isActive)
                }
              </NavLink>

              <NavLink to="/popularity/views" className="group">
                {({ isActive }) =>
                  navItem(<Eye size={18} />, "Who viewed me", "Views", modeCounts.views, isActive)
                }
              </NavLink>

              <NavLink to="/popularity/likes" className="group">
                {({ isActive }) =>
                  navItem(<Heart size={18} />, "Who liked me", "Likes", modeCounts.likes, isActive)
                }
              </NavLink>

              <NavLink to="/popularity/matches" className="group">
                {({ isActive }) =>
                  navItem(<Zap size={18} />, "Who matched with me", "Matches", modeCounts.matches, isActive)
                }
              </NavLink>
            </>
          )}

        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          <NotificationsBell />
          <ChatIndicator currentUser={currentUser} />

          <div ref={settingsMenuRef} className="relative">
            <button
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className="h-10 w-10 flex items-center justify-center border border-primary rounded-full bg-white/40 backdrop-blur-md hover:bg-white/60 transition"
            >
              <Cog color="#f163cf" size={22} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-lg border bg-white shadow-lg p-1">

                {/* Messages */}
                <button onClick={() => navigateTo("/messages")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <MessageSquareHeart size={15} /> Messages
                </button>

                {/* Blocked */}
                <button onClick={() => navigateTo("/blocked-users")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <Ban size={15} /> Blocked user
                </button>

                {/* Profile */}
                <button onClick={() => navigateTo("/profile")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <User size={15} /> Profile
                </button>

                <button onClick={handleDeleteAccount} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={15} /> Delete account
                </button>

                <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut size={15} /> Log out
                </button>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}