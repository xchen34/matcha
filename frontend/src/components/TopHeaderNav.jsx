import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PasswordInput } from "@/utils/components";
import NotificationsBell from "../notifications/NotificationsBell.jsx";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import ChatIndicator from "../chat/components/ChatIndicator.jsx";
import { 
  Zap, Cog, User, 
  Users, Eye, Heart, 
  LogOut, Trash2, Ban, 
  Lock, X,
  MessageSquareHeart 
} from "lucide-react";
import {
  notificationBadgeClass,
  inputClass,
  secondaryButtonClass,
  deleteButtonClass,
} from "@/styles/UIClasses.jsx";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { attentionBadges = {}, clearAttentionMode } = useNotifications();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (!showDeleteDialog) {
      setDeleteDialogVisible(false);
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setDeleteDialogVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [showDeleteDialog]);

  /* ========== Clear attention badges on navigation ========== */
  useEffect(() => {
    const prev = previousPathRef.current;

    if (prev === "/popularity/views") clearAttentionMode("views");
    else if (prev === "/popularity/likes") clearAttentionMode("likes");
    else if (prev === "/popularity/matches") clearAttentionMode("matches");

    previousPathRef.current = location.pathname;
  }, [location.pathname, clearAttentionMode]);

  /* ========== Mode counts for badges ========== */
  const modeCounts = {
    views: Number(attentionBadges.views || 0),
    likes: Number(attentionBadges.likes || 0),
    matches: Number(attentionBadges.matches || 0),
  };

  /* ========== Nav item component ========== */
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
        className={`hidden sm:inline font-bold whitespace-nowrap transition-colors ${
          isActive ? "text-white" : "text-[#f163cf] group-hover:text-white"
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
        <span className={notificationBadgeClass}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  if (!currentUser || isLoginPage) return null;

  function openDeleteDialog() {
    setIsSettingsOpen(false);
    setShowDeleteDialog(true);
    setDeleteDialogVisible(false);
    setDeleteError("");
    setDeletePassword("");
  }

  function closeDeleteDialog() {
    if (deletingAccount) return;

    setDeleteDialogVisible(false);
    window.setTimeout(() => {
      setShowDeleteDialog(false);
    }, 180);
  }

  async function onDeleteAccountConfirm() {
    if (!deletePassword) {
      setDeleteError("Password is required.");
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");
    const result = await handleDeleteAccount(deletePassword);
    setDeletingAccount(false);

    if (!result?.ok) {
      setDeleteError(result?.error || "Failed to delete account.");
      return;
    }

    setDeleteDialogVisible(false);
    window.setTimeout(() => {
      setShowDeleteDialog(false);
    }, 180);
    setDeletePassword("");
  }

  return (
    <header className="fixed top-2 inset-x-0 z-50 flex justify-center px-2 sm:px-4">
      {/* CAPSULE */}
      <div className="w-full max-w-5xl flex items-center h-14 bg-white/70 backdrop-blur-xl border border-white/40 shadow-md rounded-full px-2 gap-2 sm:gap-3">

        {/* LEFT */}
        <nav className="py-2 flex-1 flex flex-nowrap items-center gap-1 sm:gap-2 overflow-hidden">

          {profileLocked ? (
            <NavLink to="/profile" className="group">
              <span className="relative inline-flex h-10 items-center justify-start rounded-full border border-primary bg-primary-medium text-white px-3 gap-1.5">
                {/* Icon */}
                <span className="text-white">
                  <User size={18} />
                </span>
  
                <span className="ml-2 font-bold whitespace-nowrap text-white">
                  {/* Mobile label*/}
                  <span className="text-[11px] lg:hidden">
                    Complete profile
                  </span>
                  {/* Desktop label */}
                  <span className="hidden lg:inline text-xs">
                    Complete profile to access features
                  </span>
                </span>
              </span>
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
                  <Ban size={15} /> Blocked users
                </button>

                {/* Profile */}
                <button onClick={() => navigateTo("/profile")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
                  <User size={15} /> Profile
                </button>

                {/* Delete account */}
                <button
                  onClick={() => {
                    openDeleteDialog();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={15} /> Delete account
                </button>

                {/* Logout */}
                <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  <LogOut size={15} /> Log out
                </button>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== DELETE ACCOUNT DIALOG ========== */}
      {showDeleteDialog && (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 transition-opacity duration-200 ease-out ${
            deleteDialogVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`w-full max-w-md rounded-xl bg-white p-4 shadow-xl border border-slate-200 space-y-3 transition-all duration-200 ease-out ${
              deleteDialogVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            }`}
          >
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Trash2 size={16} className="text-red-600" />
              DELETE ACCOUNT
            </h3>
            <p className="text-sm text-slate-600">
              This action is permanent. Enter your password to confirm.
            </p>
            <div className="relative">
              <Lock
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <PasswordInput
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className={`${inputClass}`}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={closeDeleteDialog}
              >
                <X size={14} className="mr-1" />
                Cancel
              </button>
              <button
                type="button"
                className={deleteButtonClass}
                disabled={deletingAccount}
                onClick={onDeleteAccountConfirm}
              >
                <Trash2 size={15} /> 
                {/* Mobile */}
                <span className="ml-1 sm:hidden">Delete</span>
                {/* Desktop */}
                <span className="ml-1 hidden sm:inline">Delete account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
