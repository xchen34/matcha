import ChatAvatar from "@/chat/components/ChatAvatar.jsx";
import ActionButtons from "./ActionsButtons.jsx";
import { sanitizeText } from "@/utils/xssEscape.js";
import { formatDateTime } from "@/utils/date.js";

function UserList({ users, mode, unreadUserSet, startingChatFor, startChatWith, navigate, config }) {
  return (
    <div className="mt-3 w-full space-y-2">
      {/* EMPTY STATE */}
      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary bg-slate-50 px-4 py-5 text-center text-slate-600">
          No users to display.
        </div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className="
              relative flex items-center justify-between
              rounded-2xl bg-white px-4 py-3
              border border-slate-200/70 shadow-sm
              transition-all duration-200
              hover:shadow-md hover:-translate-y-0.5
            "
          >
            {/* NEW BADGE FOR UNREAD USERS */}
            {unreadUserSet.has(String(user.id)) && (
              <span className="absolute -left-2 -top-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">NEW</span>
            )}

            {/* USER INFO */}
            <div className="flex items-center gap-3">
              {/* AVATAR */}
              <ChatAvatar
                name={user.username}
                photoUrl={user.primary_photo_url || user.photo_url || user.profile_photo_url || user.avatarUrl}
                sizeClass="h-10 w-10"
                showPresence={false}
              />

              {/* USERNAME & JOIN DATE */}
              <div>
                <p className="inline-flex items-center gap-2 font-semibold text-neutral-dark">
                  @{sanitizeText(user.username)}
                </p>

                {/* EMPTY STATE */}
                <p className="text-xs text-slate-500">
                  {config.helperText || "No helper text available"}
                </p>

                <p className="text-[11px] text-slate-400">
                  {formatDateTime(user.created_at)}
                </p>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <ActionButtons
              user={user}
              mode={mode}
              startingChatFor={startingChatFor}
              startChatWith={startChatWith}
              navigate={navigate}
            />
          </div>
        ))
      )}
    </div>
  );
}

export default UserList;