import { FiLogOut, FiMessageCircle, FiSettings, FiSlash, FiTrash2, FiUser } from "react-icons/fi";
import NotificationsBell from "../notifications/NotificationsBell.jsx";
import ChatIndicator from "../chat/components/ChatIndicator.jsx";

export function HeaderBar({ 
  currentUser, 
  isLoginPage, 
  isSettingsOpen, 
  setIsSettingsOpen, 
  settingsMenuRef,
  navigateTo,
  logout,
  handleDeleteAccount 
}) {
  if (!currentUser || isLoginPage) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-[9999] pointer-events-none">
      <div className="mx-auto flex max-w-5xl justify-end px-5 sm:px-6 lg:px-8">
        <div className="pointer-events-auto relative flex items-center gap-2 rounded-full border border-orange-300 bg-orange-50/95 p-2 shadow-lg shadow-orange-200/60 backdrop-blur">
          <NotificationsBell />
          <ChatIndicator currentUser={currentUser} />
          <div ref={settingsMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-orange-200 bg-white/80 text-slate-700 hover:bg-white"
              aria-label="Open settings menu"
              title="Settings"
            >
              <FiSettings size={18} />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-12 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <button
                  type="button"
                  onClick={() => navigateTo("/profile")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  <FiUser size={15} aria-hidden="true" />
                  <span>My profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/blocked-users")}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  <FiSlash size={15} aria-hidden="true" />
                  <span>Blocked users</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/messages")}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                >
                  <FiMessageCircle size={15} aria-hidden="true" />
                  <span>Messages</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    handleDeleteAccount();
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  <FiTrash2 size={15} aria-hidden="true" />
                  <span>Delete account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  <FiLogOut size={15} aria-hidden="true" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
