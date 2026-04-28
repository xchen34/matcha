import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { FaLocationArrow } from "react-icons/fa";
import { FiCalendar, FiCompass, FiEye, FiHeart, FiImage, FiInfo, 
  FiLogIn, FiLogOut, FiMail, FiMapPin, FiMessageCircle, FiSettings, 
  FiSlash, FiTag, FiTrash2, FiUser, FiUserPlus, FiUsers} from "react-icons/fi";
import UserCard from "../components/UserCard";
import FindMatchPage from "../pages/FindMatchPage";
import BlockedUsersPage from "../pages/BlockedUsersPage";
import PopularityListPage from "../pages/PopularityListPage";
import UserProfilePage from "../pages/UserProfilePage";
import MessagesPage from "../pages/MessagesPage.jsx";
import VerifyEmailPage from "../pages/VerifyEmailPage.jsx";
import ResendVerificationPage from "../pages/ResendVerificationPage.jsx";
import VerificationSentPage from "../pages/VerificationSentPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "../pages/ResetPasswordPage.jsx";
import { NotificationsProvider } from "../notifications/NotificationsProvider.jsx";
import NotificationsBell from "../notifications/NotificationsBell.jsx";
import { useNotifications } from "../notifications/useNotifications.js";
import { connectRealtime, disconnectRealtime, getRealtimeSocket } from "../realtime/socket.js";
import { MAX_PHOTO_SIZE_BYTES, MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT, validatePhotoFile } from "../utils/photoValidator.js";
import { buildApiHeaders } from "../utils.js";
import ChatIndicator from "../chat/ChatIndicator.jsx";

const cardClass =
  "bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/70 space-y-4";
const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition";
const textareaClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition min-h-[140px]";
const selectClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition bg-white";
const primaryButtonClass =
  "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-5 py-2.5 text-sm font-semibold shadow-md shadow-orange-200 hover:-translate-y-0.5 hover:shadow-lg transition disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition";

  
export default function TopNav({ currentUser, profileLocked }) {
  const location = useLocation();
  const { attentionBadges = {}, clearAttentionMode } = useNotifications();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    if (previousPath === "/popularity/views") {
      clearAttentionMode("views");
    } else if (previousPath === "/popularity/likes") {
      clearAttentionMode("likes");
    } else if (previousPath === "/popularity/matches") {
      clearAttentionMode("matches");
    }

    previousPathRef.current = location.pathname;
  }, [location.pathname, clearAttentionMode]);

  const modeCounts = {
    views: Number(attentionBadges.views || 0),
    likes: Number(attentionBadges.likes || 0),
    matches: Number(attentionBadges.matches || 0),
  };

  const navItem = (icon, mobile, full, count) => (
    <span className="relative flex items-center justify-center sm:justify-start gap-1.5">

      <span aria-hidden="true">{icon}</span>

      <span className="sm:hidden text-xs font-medium text-slate-700">
        {mobile}
      </span>

      <span className="hidden sm:inline text-sm font-medium text-slate-700">
        {full}
      </span>

      {count > 0 && (
        <span className="absolute -right-4 -top-3 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  return (
    <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">

      {!currentUser && (
        <NavLink to="/login" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiLogIn size={15} />
            <span>Login</span>
          </span>
        </NavLink>
      )}

      {!currentUser && (
        <NavLink to="/register" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiUserPlus size={15} />
            <span className="sm:inline hidden">Create Account</span>
            <span className="sm:hidden">Join</span>
          </span>
        </NavLink>
      )}

      {currentUser && profileLocked && (
        <NavLink to="/profile" className={({ isActive }) =>
          `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
        }>
          <span className="flex items-center gap-1.5 justify-center">
            <FiUser size={15} />
            <span className="sm:inline hidden">Complete Profile</span>
            <span className="sm:hidden">Profile</span>
          </span>
        </NavLink>
      )}

      {currentUser && !profileLocked && (
        <>
          <NavLink to="/find-match" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiUsers size={15} />, "Find", "Find your match")}
          </NavLink>

          <NavLink to="/popularity/views" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiEye size={15} />, "Views", "Who viewed me", modeCounts.views)}
          </NavLink>

          <NavLink to="/popularity/likes" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(<FiHeart size={15} />, "Likes", "Who liked me", modeCounts.likes)}
          </NavLink>

          <NavLink to="/popularity/matches" className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-slate-900 border-slate-900" : ""}`
          }>
            {navItem(
              <span className="relative inline-flex h-4 w-5 items-center justify-center text-slate-500">
                <FiHeart size={11} className="absolute left-0" />
                <FiHeart size={11} className="absolute right-0" />
              </span>,
              "Matches",
              "Matches",
              modeCounts.matches,
            )}
          </NavLink>
        </>
      )}
    </nav>
  );
}