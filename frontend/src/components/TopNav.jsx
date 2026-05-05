import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiEye, FiHeart, FiLogIn, FiUser, FiUserPlus, FiUsers } from "react-icons/fi";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { secondaryButtonClass } from "../styles/UIClasses.jsx";

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

      <span className="sm:hidden text-xs font-medium text-neutral-dark">
        {mobile}
      </span>

      <span className="hidden sm:inline text-sm font-medium text-neutral-dark">
        {full}
      </span>

      {count > 0 && (
        <span className="absolute -right-4 -top-3 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  return (
    <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
      {!currentUser && (
        <NavLink
          to="/login"
          className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
          }
        >
          <span className="flex items-center gap-1.5 justify-center">
            <FiLogIn size={15} />
            <span>Login</span>
          </span>
        </NavLink>
      )}

      {!currentUser && (
        <NavLink
          to="/register"
          className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
          }
        >
          <span className="flex items-center gap-1.5 justify-center">
            <FiUserPlus size={15} />
            <span className="sm:inline hidden">Create Account</span>
            <span className="sm:hidden">Join</span>
          </span>
        </NavLink>
      )}

      {currentUser && profileLocked && (
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
          }
        >
          <span className="flex items-center gap-1.5 justify-center">
            <FiUser size={15} />
            <span className="sm:inline hidden">Complete Profile</span>
            <span className="sm:hidden">Profile</span>
          </span>
        </NavLink>
      )}

      {currentUser && !profileLocked && (
        <>
          <NavLink
            to="/find-match"
            className={({ isActive }) =>
              `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
            }
          >
            {navItem(<FiUsers size={15} />, "Find", "Find your match")}
          </NavLink>

          <NavLink
            to="/popularity/views"
            className={({ isActive }) =>
              `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
            }
          >
            {navItem(<FiEye size={15} />, "Views", "Who viewed me", modeCounts.views)}
          </NavLink>

          <NavLink
            to="/popularity/likes"
            className={({ isActive }) =>
              `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
            }
          >
            {navItem(<FiHeart size={15} />, "Likes", "Who liked me", modeCounts.likes)}
          </NavLink>

          <NavLink
            to="/popularity/matches"
            className={({ isActive }) =>
              `${secondaryButtonClass} ${isActive ? "bg-primary-dark border-primary" : ""}`
            }
          >
            {navItem(
              <span className="relative inline-flex h-4 w-5 items-center justify-center text-neutral">
                <FiHeart size={11} className="absolute left-0" />
                <FiHeart size={11} className="absolute right-0" />
              </span>,
              "Matches",
              "Matches",
              modeCounts.matches
            )}
          </NavLink>
        </>
      )}
    </nav>
  );
}