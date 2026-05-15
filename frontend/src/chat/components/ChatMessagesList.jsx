import { useMemo } from "react";
import ChatConversationMessage from "./ChatConversationMessage.jsx";
import ChatConversationStatusBadge from "./ChatConversationStatusBadge.jsx";
import { dateKey } from "../utils/messageFormat.js";

export default function ChatMessagesList({
    messages,
    loading,
    loadingMore,
    listRef,
    handleScroll,
    currentUserId,
    conversation,
    expandedMessageId,
    setExpandedMessageId,
    deletingMessageId,
    quotedMessage,
    setQuotedMessage,
    onDelete,
    wasMatchedBefore,
    unmatchedAt,
}) {
    const groupedMessages = useMemo(() => {
        const allGrouped = messages.map((msg, index) => ({
            msg,
            showDay:
                index === 0 ||
                dateKey(messages[index - 1]?.created_at) !==
                dateKey(msg?.created_at),
            isMine: Number(msg?.sender_user_id) === currentUserId,
            showMatchBadge:
                index === 0 &&
                conversation?.is_match &&
                conversation?.match_created_at,
        }));

        return allGrouped.filter(
            (item) =>
                !item.msg.content?.includes("You are no longer matched") &&
                !item.msg.content?.includes("You matched with"),
            );
    }, [messages, currentUserId, conversation?.is_match, conversation?.match_created_at]);

    return (
        <div
            ref={listRef}
            onScroll={handleScroll}
            className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 mb-2"
        >
        {/* LOADING & EMPTY STATES */}
        {loading && <p className="text-sm text-slate-500">Loading messages...</p>}
        {loadingMore && (
            <p className="text-xs text-slate-400"> Loading older messages...</p>
        )}
        {!loading && groupedMessages.length === 0 && (
            <p className="text-sm text-slate-500">
            You matched. Say hi to start the conversation.
            </p>
        )}

        {/* MESSAGE LIST */}
        <ul className="space-y-2 w-full min-w-0">
            {groupedMessages.map(({ msg, showDay, isMine }) => (
            <ChatConversationMessage
                key={`msg-${msg.id}`}
                msg={msg}
                showDay={showDay}
                isMine={isMine}
                conversation={conversation}
                currentUserId={currentUserId}
                expandedMessageId={expandedMessageId}
                setExpandedMessageId={setExpandedMessageId}
                deletingMessageId={deletingMessageId}
                onQuote={setQuotedMessage}
                onDelete={onDelete}
            />
            ))}

            <ChatConversationStatusBadge
                conversation={conversation}
                groupedMessages={groupedMessages}
                messages={messages}
                wasMatchedBefore={wasMatchedBefore}
                unmatchedAt={unmatchedAt}
            />
        </ul>
    </div>
  );
}
