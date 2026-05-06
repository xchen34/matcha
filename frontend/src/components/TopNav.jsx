import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FiEye, FiHeart, FiUser, FiUsers } from "react-icons/fi";
import { useNotifications } from "../notifications/hooks/useNotifications.js";
import { primaryButtonClass, secondaryButtonClass } from "../styles/UIClasses.jsx";

export default function TopNav({ currentUser, profileLocked }) {
  const location = useLocation();
  const { attentionBadges = {}, clearAttentionMode } = useNotifications();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    const previousPath = previousPathRef.current;

    if (previousPath === "/popularity/views") clearAttentionMode("views");
    else if (previousPath === "/popularity/likes") clearAttentionMode("likes");
    else if (previousPath === "/popularity/matches") clearAttentionMode("matches");

    previousPathRef.current = location.pathname;
  }, [location.pathname, clearAttentionMode]);

  const modeCounts = {
    views: Number(attentionBadges.views || 0),
    likes: Number(attentionBadges.likes || 0),
    matches: Number(attentionBadges.matches || 0),
  };

  // Nav item (plus de cercle autour de l'icône)
  const navItem = (icon, label, shortLabel, count = 0) => (
    <span className="relative flex items-center justify-center sm:gap-1.5">
      
      {icon}

      {/* Texte responsive */}
      <span className="hidden sm:inline md:hidden text-sm font-medium ml-1">
        {shortLabel}
      </span>
      <span className="hidden md:inline text-sm font-medium ml-1">
        {label}
      </span>

      {/* Badge */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );

  if (!currentUser) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-[9999] pointer-events-none">
      <div className="mx-auto flex max-w-5xl justify-start px-4 sm:px-6 lg:px-8">
        <nav className="pointer-events-auto flex gap-2 sm:gap-3 rounded-full border bg-primary-light/95 backdrop-blur p-2 shadow-lg shadow-pink-200/60">

          {profileLocked && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${isActive ? primaryButtonClass : secondaryButtonClass}
                 flex items-center justify-center
                 w-10 h-10 sm:w-auto sm:h-auto
                 rounded-full`
              }
            >
              {navItem(<FiUser size={20} />, "Complete Profile", "Profile")}
            </NavLink>
          )}

          {!profileLocked && (
            <>
              <NavLink
                to="/find-match"
                className={({ isActive }) =>
                  `${isActive ? primaryButtonClass : secondaryButtonClass}
                   flex items-center justify-center
                   w-10 h-10 sm:w-auto sm:h-auto
                   rounded-full`
                }
              >
                {navItem(<FiUsers size={20} />, "Find my match", "Find")}
              </NavLink>

              <NavLink
                to="/popularity/views"
                className={({ isActive }) =>
                  `${isActive ? primaryButtonClass : secondaryButtonClass}
                   flex items-center justify-center
                   w-10 h-10 sm:w-auto sm:h-auto
                   rounded-full`
                }
              >
                {navItem(<FiEye size={20} />, "Who viewed me", "Views", modeCounts.views)}
              </NavLink>

              <NavLink
                to="/popularity/likes"
                className={({ isActive }) =>
                  `${isActive ? primaryButtonClass : secondaryButtonClass}
                   flex items-center justify-center
                   w-10 h-10 sm:w-auto sm:h-auto
                   rounded-full`
                }
              >
                {navItem(<FiHeart size={20} />, "Who likes me", "Likes", modeCounts.likes)}
              </NavLink>

              <NavLink
                to="/popularity/matches"
                className={({ isActive }) =>
                  `${isActive ? primaryButtonClass : secondaryButtonClass}
                   flex items-center justify-center
                   w-10 h-10 sm:w-auto sm:h-auto
                   rounded-full`
                }
              >
                {navItem(
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <FiHeart size={11} className="absolute left-0" />
                    <FiHeart size={11} className="absolute right-0" />
                  </span>,
                  "Who matched with me",
                  "Matches",
                  modeCounts.matches
                )}
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}