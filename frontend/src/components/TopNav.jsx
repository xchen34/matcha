import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiEye, FiHeart, FiLogIn, FiUser, FiUserPlus, FiUsers } from "react-icons/fi";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { secondaryButtonClass } from "../styles/UIClasses.jsx";
import { Zap } from "lucide-react";

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

  const navItem = (icon, mobile, full, count, isActive) => (
    <span className="relative flex items-center justify-center sm:justify-start gap-1.5">
      <span aria-hidden="true" className={`transition-colors ${isActive ? "text-white" : "text-[#f163cf] group-hover:text-white"}`}>
        {icon}
      </span>

      <span className={`sm:hidden text-xxs font-medium transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>
        {mobile}
      </span>

      <span className={`hidden sm:inline text-xs font-medium transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>
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
            `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
          }
        >
          {({ isActive }) => (
            <span className="flex items-center gap-1.5 justify-center">
              <FiLogIn size={15} className={`transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`} />
              <span className={`transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>Login</span>
            </span>
          )}
        </NavLink>
      )}

      {!currentUser && (
        <NavLink
          to="/register"
          className={({ isActive }) =>
            `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
          }
        >
          {({ isActive }) => (
            <span className="flex items-center gap-1.5 justify-center">
              <FiUserPlus size={15} className={`transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`} />
              <span className={`sm:inline hidden transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>Create Account</span>
              <span className={`sm:hidden transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>Join</span>
            </span>
          )}
        </NavLink>
      )}

      {currentUser && profileLocked && (
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
          }
        >
          {({ isActive }) => (
            <span className="flex items-center gap-1.5 justify-center">
              <FiUser size={15} className={`transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`} />
              <span className={`sm:inline hidden transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>Complete Profile</span>
              <span className={`sm:hidden transition-colors ${isActive ? "text-white" : "text-neutral-dark group-hover:text-white"}`}>Profile</span>
            </span>
          )}
        </NavLink>
      )}

      {currentUser && !profileLocked && (
        <>
          <NavLink
            to="/find-match"
            className={({ isActive }) =>
              `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
            }
          >
            {({ isActive }) => navItem(<FiUsers size={24} />, "Find", "Find my match", 0, isActive)}
          </NavLink>

          <NavLink
            to="/popularity/views"
            className={({ isActive }) =>
              `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
            }
          >
            {({ isActive }) => navItem(<FiEye size={24} />, "Views", "Who viewed me", modeCounts.views, isActive)}
          </NavLink>

          <NavLink
            to="/popularity/likes"
            className={({ isActive }) =>
              `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
            }
          >
            {({ isActive }) => navItem(<FiHeart size={24} />, "Likes", "Who liked me", modeCounts.likes, isActive)}
          </NavLink>

          <NavLink
            to="/popularity/matches"
            className={({ isActive }) =>
              `group ${secondaryButtonClass} ${isActive ? "!bg-primary-medium !border-primary" : ""}`
            }
          >
            {({ isActive }) => navItem(
              <Zap size={24} />,
              "Matches",
              "My matches",
              modeCounts.matches,
              isActive
            )}
          </NavLink>
        </>
      )}
    </nav>
  );
}