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

  const linkClass = ({ isActive }) =>
    `relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2
     text-[9px] sm:text-sm font-medium px-1 sm:px-2 h-14
     transition-transform duration-200 ease-out
     hover:scale-105
     ${isActive ? "text-primary-dark" : "text-slate-700 hover:text-primary-dark"}`;

  const underline =
    "after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-primary-dark";

  const Label = ({ mobile, tablet, desktop }) => (
    <>
      {/* mobile → texte sous l’icône */}
      <span className="sm:hidden leading-none">{mobile}</span>

      {/* tablette */}
      <span className="hidden sm:inline md:hidden">{tablet}</span>

      {/* desktop */}
      <span className="hidden md:inline">{desktop}</span>
    </>
  );

  // Ne pas afficher si pas connecté ou sur la page login
  if (!currentUser || isLoginPage) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-2 sm:px-4 lg:px-6 gap-2 sm:gap-3">

        {/* NAV */}
        <nav className="flex-1 flex justify-start items-center gap-2 sm:gap-4 overflow-hidden">

          {/* FIND */}
          <NavLink
            to="/find-match"
            className={({ isActive }) => `${linkClass({ isActive })} ${isActive ? underline : ""}`}
          >
            <FiUsers size={16} />
            <Label mobile="Find" tablet="Find" desktop="Find my match" />
          </NavLink>

          {/* VIEWS */}
          <NavLink
            to="/popularity/views"
            className={({ isActive }) => `${linkClass({ isActive })} ${isActive ? underline : ""}`}
          >
            <FiEye size={16} />
            <Label mobile="Views" tablet="Views" desktop="Who viewed me" />

            {modeCounts.views > 0 && (
              <span className="ml-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {modeCounts.views > 99 ? "99+" : modeCounts.views}
              </span>
            )}
          </NavLink>

          {/* LIKES */}
          <NavLink
            to="/popularity/likes"
            className={({ isActive }) => `${linkClass({ isActive })} ${isActive ? underline : ""}`}
          >
            <FiHeart size={16} />
            <Label mobile="Likes" tablet="Likes" desktop="Who liked me" />

            {modeCounts.likes > 0 && (
              <span className="ml-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {modeCounts.likes > 99 ? "99+" : modeCounts.likes}
              </span>
            )}
          </NavLink>

          {/* MATCHES */}
          <NavLink
            to="/popularity/matches"
            className={({ isActive }) => `${linkClass({ isActive })} ${isActive ? underline : ""}`}
          >
            <Zap size={16} />
            <Label mobile="Match" tablet="Match" desktop="Who matched with me" />

            {modeCounts.matches > 0 && (
              <span className="ml-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                {modeCounts.matches > 99 ? "99+" : modeCounts.matches}
              </span>
            )}
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
                <button onClick={handleDeleteAccount} className="flex w-full items-center gap-2 border px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
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
