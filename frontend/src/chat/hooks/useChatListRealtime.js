import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onRealtimeEvent } from "@/realtime/socket.js";
import { REALTIME_EVENTS } from "@/realtime/events.js";

export function useChatListRealtime({
    currentUserId,
    conversations,
    setConversations,
    loadConversations,
    markId,
    removedConversationId,
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const knownConversationIdsRef = useRef(new Set());

    /* ============ Track known conversation IDs =========== */
    useEffect(() => {
        knownConversationIdsRef.current = new Set(
        conversations
            .map((conv) => Number(conv.conversation_id))
            .filter(Number.isInteger),
        );
    }, [conversations]);

    /* ========== Realtime : New messages ========== */
    useEffect(() => {
        if (!currentUserId) return undefined;

        const off = onRealtimeEvent("chat:message:created", (payload) => {
        const message = payload?.message;
        const conversationId = Number(message?.conversation_id);

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
            return;
        }

        const senderUserId = Number(message?.sender_user_id);
        const recipientUserId = Number(message?.recipient_user_id);

        if (!Number.isInteger(senderUserId) || !Number.isInteger(recipientUserId)) {
            return;
        }

        /* If the conversation unknown reload the conversations */
        if (!knownConversationIdsRef.current.has(conversationId)) {
            void loadConversations();
            return;
        }

        /* Update the conversation's last message and unread count */
        setConversations((prev) => {
            const targetIndex = prev.findIndex(
                (conv) => Number(conv.conversation_id) === conversationId,
            );

            if (targetIndex === -1) {
                return prev;
            }

            const target = prev[targetIndex];
            const unreadIncrement =
                recipientUserId === Number(currentUserId) ? 1 : 0;

            const updated = {
                ...target,
                last_message: {
                    sender_user_id: senderUserId,
                    content: String(message?.content || ""),
                    created_at: message?.created_at,
                },
                unread_count: Math.max(
                    0,
                    Number(target.unread_count || 0) + unreadIncrement,
                ),
            };

            return [
                updated,
                ...prev.slice(0, targetIndex),
                ...prev.slice(targetIndex + 1),
            ];
        });
        });

        return () => off();
    }, [currentUserId, loadConversations, setConversations]);

    /* ========== Realtime : Conversation read & block status events========== */
    useEffect(() => {
        if (!currentUserId) return undefined;

        const offRead = onRealtimeEvent(
            REALTIME_EVENTS.CHAT_CONVERSATION_READ,
            (payload) => {
                const conversationId = Number(payload?.conversation_id);
                const readerUserId = Number(payload?.reader_user_id);

                if (!Number.isInteger(conversationId) || conversationId <= 0) return;
                if (Number(readerUserId) !== Number(currentUserId)) return;

                setConversations((prev) =>
                    prev.map((conv) =>
                        Number(conv.conversation_id) === conversationId
                        ? { ...conv, unread_count: 0 }
                        : conv,
                    ),
                );
            },
        );

        const offBlockStatusChanged = onRealtimeEvent(
            REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
            (payload) => {
                const userA = Number(payload?.user_a_id);
                const userB = Number(payload?.user_b_id);

                if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;
                if (Number(currentUserId) !== userA && Number(currentUserId) !== userB) return;

                void loadConversations();
            },
        );

        return () => {
            offRead();
            offBlockStatusChanged();
        };
    }, [currentUserId, loadConversations, setConversations]);

    /* ========== Realtime : Conversation deleted ========== */
    useEffect(() => {
        if (!currentUserId) return undefined;

        const offMessageDeleted = onRealtimeEvent(
        REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
        (payload) => {
            const conversationId = Number(payload?.conversation_id);
            const eventUserId = Number(payload?.user_id);

            if (!Number.isInteger(conversationId) || conversationId <= 0) return;
            if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUserId)) return;

            void loadConversations();
        },
        );

        const offConversationDeleted = onRealtimeEvent(
        REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
        (payload) => {
            const conversationId = Number(payload?.conversation_id);
            const eventUserId = Number(payload?.user_id);

            if (!Number.isInteger(conversationId) || conversationId <= 0) return;
            if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUserId)) return;

            setConversations((prev) =>
                prev.filter(
                    (conv) => Number(conv.conversation_id) !== conversationId,
                ),
            );
        },
        );

        return () => {
            offMessageDeleted();
            offConversationDeleted();
        };
    }, [currentUserId, loadConversations, setConversations]);

    /* ========== Realtime : Removed conversation state ========== */
    useEffect(() => {
        if (!removedConversationId) return;

        setConversations((prev) =>
            prev.filter(
                (conv) => Number(conv.conversation_id) !== Number(removedConversationId),
            ),
        );
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, navigate, removedConversationId, setConversations]);

    /* ========== Realtime : Presence updates event ========== */
    useEffect(() => {
        if (!currentUserId) return undefined;

        const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
        const targetUserId = Number(payload?.user_id);
        if (!Number.isInteger(targetUserId)) return;

        setConversations((prev) =>
            prev.map((conv) =>
                Number(conv.other_user?.id) === targetUserId
                    ? {
                        ...conv,
                        other_user: {
                        ...conv.other_user,
                        is_online: Boolean(payload.is_online),
                        last_seen_at: payload.last_seen_at || conv.other_user.last_seen_at,
                        },
                    }
                    : conv,
                ),
            );
        });

        return () => offPresenceUpdate();
    }, [currentUserId, setConversations]);

    /* ========== Realtime : Mark conversation as read ========== */
    useEffect(() => {
        if (!markId) return;

        setConversations((prev) =>
            prev.map((conv) =>
                Number(conv.conversation_id) === markId
                ? { ...conv, unread_count: 0 }
                : conv,
            ),
        );
        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, markId, navigate, setConversations]);
}