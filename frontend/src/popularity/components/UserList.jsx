import ChatAvatar from "@/chat/components/ChatAvatar.jsx";
import ActionButtons from "./ActionsButtons.jsx";
import { sanitizeText } from "@/utils/xssEscape.js";
import { formatDateTime } from "@/utils/date.js";

function UserList({ users, mode, unreadUserSet, startingChatFor, startChatWith, navigate, config }) {
  return (
    <div className="space-y-2 mt-3">
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-slate-600">
          No users to display.
        </div>
      ) : (
        users.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <ChatAvatar
                name={user.username}
                photoUrl={user.primary_photo_url || user.photo_url || user.profile_photo_url || user.avatarUrl}
                sizeClass="h-10 w-10"
                showPresence={false}
              />
              <div>
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
                  @{sanitizeText(user.username)}
                  {unreadUserSet.has(String(user.id)) && (
                    <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">NEW</span>
                  )}
                </p>
                
                {/* Dynamique helper text */}
                <p className="text-xs text-slate-500">
                  {config.helperText || "No helper text available"}
                </p>

                <p className="text-[11px] text-slate-400">
                  {formatDateTime(user.created_at)}
                </p>
              </div>
            </div>
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