import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiEye,
  FiHeart,
  FiUser,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiTrash2,
  FiSlash,
  FiMessageSquare,
  FiMessageCircle
} from "react-icons/fi";

import NotificationsBell from "../notifications/NotificationsBell.jsx";
import ChatIndicator from "../chat/components/ChatIndicator.jsx";
import { useNotifications } from "../notifications/hooks/useNotifications.js";

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
      <span className="sm:hidden text-[9px] leading-none">{mobile}</span>

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

        {/* LEFT : Logo */}
        <div
          onClick={() => navigateTo("/")}
          className="flex-shrink-0 cursor-pointer font-semibold text-sm sm:text-base lg:text-lg text-slate-900"
        >
          Matcha
        </div>

        {/* CENTER NAV */}
        <nav className="flex-1 flex justify-center items-center gap-2 sm:gap-4 overflow-hidden">

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
            <FiHeart size={16} />
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
              className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center border rounded-md bg-white hover:bg-slate-50"
            >
              <FiSettings size={18} />
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

// import { primaryButtonClass, secondaryButtonClass } from "@/styles/UIClasses.jsx";

// export function TopHeaderNav({
//   currentUser,
//   profileLocked,
//   isLoginPage,
//   isSettingsOpen,
//   setIsSettingsOpen,
//   settingsMenuRef,
//   navigateTo,
//   logout,
//   handleDeleteAccount
// }) {
//   const location = useLocation();
//   const { attentionBadges = {}, clearAttentionMode } = useNotifications();
//   const previousPathRef = useRef(location.pathname);

//   useEffect(() => {
//     const previousPath = previousPathRef.current;

//     if (previousPath === "/popularity/views") clearAttentionMode("views");
//     else if (previousPath === "/popularity/likes") clearAttentionMode("likes");
//     else if (previousPath === "/popularity/matches") clearAttentionMode("matches");

//     previousPathRef.current = location.pathname;
//   }, [location.pathname, clearAttentionMode]);

//   if (!currentUser || isLoginPage) return null;

//   const modeCounts = {
//     views: Number(attentionBadges.views || 0),
//     likes: Number(attentionBadges.likes || 0),
//     matches: Number(attentionBadges.matches || 0),
//   };

//   const navItem = (icon, label, shortLabel, count = 0) => (
//     <span className="relative flex items-center justify-center sm:gap-1">
//       {icon}

//       <span className="hidden sm:inline md:hidden text-sm font-medium ml-1">
//         {shortLabel}
//       </span>
//       <span className="hidden md:inline text-sm font-medium ml-1">
//         {label}
//       </span>

//       {count > 0 && (
//         <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
//           {count > 99 ? "99+" : count}
//         </span>
//       )}
//     </span>
//   );

//   const baseBtn = (isActive) =>
//     `${isActive ? primaryButtonClass : secondaryButtonClass}
//      flex items-center justify-center
//      w-10 h-10 sm:w-auto sm:h-auto
//      rounded-full`;

//   return (
//     <div className="fixed inset-x-0 top-4 z-[9999] pointer-events-none">
//       <div className="mx-auto flex max-w-5xl px-4 sm:px-4 md:px-6 lg:px-4">
        
//         {/* CAPSULE UNIQUE */}
//         <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-full border bg-primary-light/95 backdrop-blur p-2 shadow-md shadow-pink-200/60">

//           {/* LEFT BLOCK : Logo + Nav */}
//           <div className="flex items-center gap-3">

//             {/* Logo */}
//             <div
//               onClick={() => navigateTo("/")}
//               className="hidden md:block flex-shrink-0 cursor-pointer font-semibold text-sm sm:text-base lg:text-lg text-slate-900"
//             >
//               Matcha
//             </div>

//             {/* Nav */}
//             <div className="flex gap-1 sm:gap-3">
//               {profileLocked ? (
//                 <NavLink to="/profile" className={({ isActive }) => baseBtn(isActive)}>
//                   {navItem(<FiUser size={20} />, "Complete Profile", "Profile")}
//                 </NavLink>
//               ) : (
//                 <>
//                   <NavLink to="/find-match" className={({ isActive }) => baseBtn(isActive)}>
//                     {navItem(<FiUsers size={20} />, "Find my match", "Find")}
//                   </NavLink>

//                   <NavLink to="/popularity/views" className={({ isActive }) => baseBtn(isActive)}>
//                     {navItem(<FiEye size={20} />, "Who viewed me", "Views", modeCounts.views)}
//                   </NavLink>

//                   <NavLink to="/popularity/likes" className={({ isActive }) => baseBtn(isActive)}>
//                     {navItem(<FiHeart size={20} />, "Who likes me", "Likes", modeCounts.likes)}
//                   </NavLink>

//                   <NavLink to="/popularity/matches" className={({ isActive }) => baseBtn(isActive)}>
//                     {navItem(
//                       <span className="relative inline-flex h-5 w-5 items-center justify-center">
//                         <FiHeart size={11} className="absolute left-0" />
//                         <FiHeart size={11} className="absolute right-0" />
//                       </span>,
//                       "Who matches me",
//                       "Matches",
//                       modeCounts.matches
//                     )}
//                   </NavLink>
//                 </>
//               )}
//             </div>
//           </div>

//           {/* RIGHT : ACTIONS */}
//           <div className="flex items-center gap-2">
//             <NotificationsBell />
//             <ChatIndicator currentUser={currentUser} />

//             <div ref={settingsMenuRef} className="relative">
//               <button
//                 type="button"
//                 onClick={() => setIsSettingsOpen((prev) => !prev)}
//                 className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 hover:bg-white"
//               >
//                 <FiSettings size={18} />
//               </button>

//               {isSettingsOpen && (
//                 <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-xl border bg-white shadow-xl p-2">
//                   {/* Messages */}
//                  <button onClick={() => navigateTo("/messages")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
//                    <FiMessageSquare size={15} /> Messages
//                  </button>

//                  {/* Blocked */}
//                  <button onClick={() => navigateTo("/blocked-users")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
//                    <FiSlash size={15} /> Blocked user
//                  </button>

//                  {/* Profile */}
//                  <button onClick={() => navigateTo("/profile")} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-primary-light rounded-lg">
//                    <FiUser size={15} /> Profile
//                  </button>

//                  {/* Delete account */}
//                  <button onClick={handleDeleteAccount} className="flex w-full items-center gap-2 border px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
//                    <FiTrash2 size={15} /> Delete account
//                  </button>

//                  {/* Logout */}
//                  <button onClick={logout} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
//                    <FiLogOut size={15} /> Log out
//                  </button>
//                 </div>
//               )}
//             </div>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }