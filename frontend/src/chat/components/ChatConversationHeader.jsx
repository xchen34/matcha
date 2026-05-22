import { useNavigate } from "react-router-dom";
import ChatAvatar from "./ChatAvatar.jsx";
import { MoveLeft, Trash2 } from "lucide-react";
import { tertiaryButtonClass, deleteButtonClass } from "@/styles/UIClasses.jsx";

export default function ChatConversationHeader({
    conversation,
    embedded,
    deletingConversation,
    onDelete,
}) {
    const navigate = useNavigate();

    const conversationTitle = conversation?.other_user?.username
        ? `@${conversation.other_user.username}`
        : "?";

    return (
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 mb-2">
        {/* NAVIGATE TO USER PROFILE */}
        <div className="flex items-center gap-3">
            <button
            type="button"
            onClick={() =>
                navigate(`/users/${conversation?.other_user?.id}`)
            }
            className="hover:opacity-75 transition-opacity"
                >
                <ChatAvatar
                    name={conversation?.other_user?.username || "?"}
                    photoUrl={conversation?.other_user?.primary_photo_url}
                    isOnline={Boolean(conversation?.other_user?.is_online)}
                />
            </button>

            {/* USERNAME + STATUS */}
            <div>
                <h2
                    className="text-xl font-bold text-neutral-dark cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() =>
                    navigate(`/users/${conversation?.other_user?.id}`)
                    }
                >
                    {conversationTitle}
                </h2>
            
                {/* Status badge */}
                {conversation?.blocked_by_you ? (
                    <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-[1px] text-[11px] font-medium text-red-700">
                    Blocked
                    </span>
                ) : conversation?.blocked_you ? (
                    <span className="ml-1 rounded-full border border-red-300 bg-red-100 px-2 py-[1px] text-[11px] font-medium text-red-700">
                    Blocked you
                    </span>
                ) : conversation?.is_match ? (
                    <span className="ml-1 rounded-full border border-green-300 bg-green-100 px-2 py-[1px] text-[11px] font-medium text-green-700">
                    Matched
                    </span>
                ) : (
                    <span className="ml-1 rounded-full border border-yellow-300 bg-yellow-100 px-2 py-[1px] text-[11px] font-medium text-yellow-800">
                    Unmatched
                    </span>
                )}
            </div>
        </div>

        {/* ACTIONS BUTTONS */}
        <div className="flex items-center gap-2">
            {/* Back to inbox (only if not embedded) */}
            {!embedded && (
                <button
                    type="button"
                    onClick={() => navigate("/messages")}
                    className={`${tertiaryButtonClass} h-8 px-2 text-xs`}
                >
                    <MoveLeft size={14} />

                    {/* desktop */}
                    <span className="hidden sm:inline ml-1">Back to inbox</span>
                </button>
            )}

            {/* Delete conversation */}
            <button
                type="button"
                onClick={onDelete}
                disabled={deletingConversation || !conversation?.id}
                className={`${deleteButtonClass} h-8 px-2 text-xs`}
            >
                <Trash2 size={14} />

                {/* mobile */}
                <span className="sm:hidden ml-1">
                    {deletingConversation ? "..." : "Delete"}
                </span>

                {/* desktop */}
                <span className="hidden sm:inline ml-1">
                    {deletingConversation ? "Deleting…" : "Delete chat"}
                </span>
            </button>
        </div>
    </header>
  );
}
