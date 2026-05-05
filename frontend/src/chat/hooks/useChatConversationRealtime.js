import { useEffect } from "react";
import { markConversationAsRead } from "./api.js";
import {
  joinConversationRoom,
  leaveConversationRoom,
  onRealtimeEvent,
} from "../../realtime/socket.js";
import { REALTIME_EVENTS } from "../../realtime/events.js";
import { dedupeMessages } from "../utils/messageFormat.js";

export function useChatConversationRealtime({
  conversationId,
  activeConversationId,
  currentUserId,
  otherUserId,
  loadConversation,
  navigate,
  setConversation,
  setMessages,
  setQuotedMessage,
  setWasMatchedBefore,
  setUnmatchedAt,
}) {
  useEffect(() => {
    const id = Number(conversationId);
    if (!Number.isInteger(id) || id <= 0) return undefined;
    joinConversationRoom(id);
    return () => leaveConversationRoom(id);
  }, [conversationId]);

  useEffect(() => {
    if (!activeConversationId || !currentUserId) return undefined;

    const offCreated = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_CREATED,
      ({ message }) => {
        if (Number(message?.conversation_id) !== activeConversationId) return;
        setMessages((prev) => dedupeMessages([...prev, message]));
        if (Number(message?.sender_user_id) !== currentUserId) {
          void markConversationAsRead(
            { id: currentUserId },
            activeConversationId,
          ).catch(() => {});
        }
      },
    );

    const offDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
      (payload) => {
        if (Number(payload?.conversation_id) !== activeConversationId) return;
        const messageId = Number(payload?.message_id);
        if (!Number.isInteger(messageId)) return;
        setMessages((prev) => prev.filter((m) => Number(m.id) !== messageId));
        setQuotedMessage((prev) =>
          Number(prev?.id) === messageId ? null : prev,
        );
      },
    );

    const offConversationDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
      (payload) => {
        if (Number(payload?.conversation_id) !== activeConversationId) return;
        navigate("/messages", { replace: true });
      },
    );

    const offPresenceUpdate = onRealtimeEvent(
      REALTIME_EVENTS.PRESENCE_UPDATE,
      (payload) => {
        const targetUserId = Number(payload?.user_id);
        if (
          !Number.isInteger(targetUserId) ||
          targetUserId !== Number(otherUserId)
        )
          return;

        setConversation((prev) => {
          if (!prev?.other_user) return prev;
          return {
            ...prev,
            other_user: {
              ...prev.other_user,
              is_online: Boolean(payload.is_online),
              last_seen_at:
                payload.last_seen_at || prev.other_user.last_seen_at,
            },
          };
        });
      },
    );

    const offBlockStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
      (payload) => {
        const userA = Number(payload?.user_a_id);
        const userB = Number(payload?.user_b_id);
        if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;
        if (Number(currentUserId) !== userA && Number(currentUserId) !== userB)
          return;
        if (
          Number(payload?.conversation_id) &&
          Number(payload.conversation_id) !== activeConversationId
        )
          return;
        void loadConversation();
      },
    );

    const offMatchStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.MATCH_STATUS_CHANGED,
      (payload) => {
        if (Number(payload?.userId) !== Number(otherUserId)) return;
        setConversation((prev) => {
          if (!prev) return prev;
          const wasMatched = prev.is_match;
          const isNowMatched = payload.matched;

          if (wasMatched && !isNowMatched) {
            setWasMatchedBefore(true);
            setUnmatchedAt(new Date());
          }

          return {
            ...prev,
            is_match: isNowMatched,
          };
        });
      },
    );

    return () => {
      offCreated();
      offDeleted();
      offConversationDeleted();
      offPresenceUpdate();
      offBlockStatusChanged();
      offMatchStatusChanged();
    };
  }, [
    activeConversationId,
    currentUserId,
    loadConversation,
    navigate,
    otherUserId,
    setConversation,
    setMessages,
    setQuotedMessage,
    setUnmatchedAt,
    setWasMatchedBefore,
  ]);
}
