import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiEye,
  FiHeart,
  FiUser,
  FiUsers,
  FiLogOut,
  FiTrash2,
  FiSlash,
  FiMessageSquare,
  FiMessageCircle
} from "react-icons/fi";

import NotificationsBell from "../notifications/NotificationsBell.jsx";
import ChatIndicator from "../chat/components/ChatIndicator.jsx";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { Zap, Cog } from "lucide-react";

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

  const navItem = (icon, full, count, isActive) => (
    <>
      <span
        className={`relative inline-flex h-10 w-10 lg:w-auto items-center justify-center lg:justify-start rounded-full border px-0 lg:px-4 transition-all duration-200 gap-0 lg:gap-1.5 ${
          isActive
            ? "border-primary bg-primary-medium text-white"
            : "border-primary bg-white text-neutral-dark hover:bg-primary-medium hover:text-white"
        }`}
      >
        <span
          aria-hidden="true"
          className={`transition-colors ${isActive ? "text-white" : "text-[#f163cf] group-hover:text-white"}`}
        >
          {icon}
        </span>

        <span
          className={`hidden lg:inline text-xs font-medium whitespace-nowrap transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}
        >
          {full}
        </span>

        {count > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
    </>
  );

  // Ne pas afficher si pas connecté ou sur la page login
  if (!currentUser || isLoginPage) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-2 sm:px-4 lg:px-6 gap-2 sm:gap-3">

        {/* NAV */}
        <nav className="flex-1 flex flex-nowrap justify-start items-center gap-1 sm:gap-2 overflow-hidden">

          {/* FIND */}
          <NavLink
            to="/find-match"
            className="group"
          >
            {({ isActive }) => navItem(<FiUsers size={18} />, "Find my match", 0, isActive)}
          </NavLink>

          {/* VIEWS */}
          <NavLink
            to="/popularity/views"
            className="group"
          >
            {({ isActive }) => navItem(<FiEye size={18} />, "Who viewed me", modeCounts.views, isActive)}
          </NavLink>

          {/* LIKES */}
          <NavLink
            to="/popularity/likes"
            className="group"
          >
            {({ isActive }) => navItem(<FiHeart size={18} />, "Who liked me", modeCounts.likes, isActive)}
          </NavLink>

          {/* MATCHES */}
          <NavLink
            to="/popularity/matches"
            className="group"
          >
            {({ isActive }) => navItem(<Zap size={18} />, "Who matched with me", modeCounts.matches, isActive)}
          </NavLink>

        </nav>

        {/* RIGHT : notifications, chat, settings */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">

          <NotificationsBell />
          <ChatIndicator currentUser={currentUser} />

          {/* SETTINGS MENU */}
          <div ref={settingsMenuRef} className="relative">
            <button
              onClick={() => setIsSettingsOpen(prev => !prev)}
              className="h-10 w-10 flex items-center justify-center border border-primary-dark rounded-full bg-white hover:bg-slate-50"
            >
              <Cog color="#f163cf" size={24} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-lg border bg-white shadow-lg p-1">

                {/* Messages */}
                <button onClick={() => navigateTo("/messages")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <FiMessageSquare size={15} /> Messages
                </button>

                {/* Blocked */}
                <button onClick={() => navigateTo("/blocked-users")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <FiSlash size={15} /> Blocked user
                </button>

                {/* Profile */}
                <button onClick={() => navigateTo("/profile")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <FiUser size={15} /> Profile
                </button>

                {/* Delete account */}
                <button onClick={handleDeleteAccount} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <FiTrash2 size={15} /> Delete account
                </button>

                {/* Logout */}
                <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <FiLogOut size={15} /> Log out
                </button>

              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
