import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { onRealtimeEvent } from "@/realtime/socket.js";
import { REALTIME_EVENTS } from "@/realtime/events.js";

// 聊天列表页专用 realtime hook。
// 它负责把实时事件同步到会话列表上，例如：
// - 新消息来了，列表顶部和未读数更新
// - 某个会话已读，未读数归零
// - 会话被删掉，列表移除
// - 对方在线状态变化，头像圆点更新
export function useChatListRealtime({
  currentUserId,
  conversations,
  setConversations,
  loadConversations,
  markId,
  removedConversationId,
}) {
  // 当前路由位置。
  const location = useLocation();

  // 用于跳转。
  const navigate = useNavigate();

  // 保存当前列表里已经知道的会话 ID。
  const knownConversationIdsRef = useRef(new Set());

  // 每次 conversations 变化时，重新记录已知会话 ID。
  useEffect(() => {
    knownConversationIdsRef.current = new Set(
      conversations
        .map((conv) => Number(conv.conversation_id))
        .filter(Number.isInteger),
    );
  }, [conversations]);

  // 监听“新消息”事件。
  useEffect(() => {
    // 没有当前用户就不监听。
    if (!currentUserId) return undefined;

    // 注册消息创建事件。
    const off = onRealtimeEvent("chat:message:created", (payload) => {
      // 取出消息对象。
      const message = payload?.message;

      // 从消息里拿会话 ID。
      const conversationId = Number(message?.conversation_id);

      // 会话 ID 非法就忽略。
      if (!Number.isInteger(conversationId) || conversationId <= 0) {
        return;
      }

      // 取发送者和接收者 ID。
      const senderUserId = Number(message?.sender_user_id);
      const recipientUserId = Number(message?.recipient_user_id);

      // 非法数据直接忽略。
      if (!Number.isInteger(senderUserId) || !Number.isInteger(recipientUserId)) {
        return;
      }

      // 如果这个会话不在当前列表里，直接重新拉一次列表。
      if (!knownConversationIdsRef.current.has(conversationId)) {
        void loadConversations();
        return;
      }

      // 更新会话里的最后一条消息和未读数。
      setConversations((prev) => {
        // 找到这条会话在列表里的位置。
        const targetIndex = prev.findIndex(
          (conv) => Number(conv.conversation_id) === conversationId,
        );

        // 找不到就原样返回。
        if (targetIndex === -1) {
          return prev;
        }

        // 当前会话对象。
        const target = prev[targetIndex];

        // 如果消息是发给当前用户的，未读数就 +1。
        const unreadIncrement =
          recipientUserId === Number(currentUserId) ? 1 : 0;

        // 生成更新后的会话对象。
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

        // 把更新后的会话放到列表最前面。
        return [
          updated,
          ...prev.slice(0, targetIndex),
          ...prev.slice(targetIndex + 1),
        ];
      });
    });

    // cleanup 时取消监听。
    return () => off();
  }, [currentUserId, loadConversations, setConversations]);

  // 监听已读状态和拉黑状态变化。
  useEffect(() => {
    // 没有当前用户就不监听。
    if (!currentUserId) return undefined;

    // 监听会话已读。
    const offRead = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_READ,
      (payload) => {
        // 会话 ID。
        const conversationId = Number(payload?.conversation_id);

        // 谁读的。
        const readerUserId = Number(payload?.reader_user_id);

        // 非法数据就忽略。
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;

        // 只处理“自己读了消息”的情况。
        if (Number(readerUserId) !== Number(currentUserId)) return;

        // 把对应会话的未读数清零。
        setConversations((prev) =>
          prev.map((conv) =>
            Number(conv.conversation_id) === conversationId
              ? { ...conv, unread_count: 0 }
              : conv,
          ),
        );
      },
    );

    // 监听拉黑状态变化。
    const offBlockStatusChanged = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_BLOCK_STATUS_CHANGED,
      (payload) => {
        // 双方用户 ID。
        const userA = Number(payload?.user_a_id);
        const userB = Number(payload?.user_b_id);

        // 非法数据忽略。
        if (!Number.isInteger(userA) || !Number.isInteger(userB)) return;

        // 如果当前用户不在这段关系里，不用处理。
        if (Number(currentUserId) !== userA && Number(currentUserId) !== userB) return;

        // 拉黑状态变化后，重新拉取会话列表。
        void loadConversations();
      },
    );

    // cleanup。
    return () => {
      offRead();
      offBlockStatusChanged();
    };
  }, [currentUserId, loadConversations, setConversations]);

  // 监听会话删除事件。
  useEffect(() => {
    // 没有当前用户就不监听。
    if (!currentUserId) return undefined;

    // 监听消息删除。
    const offMessageDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_MESSAGE_DELETED,
      (payload) => {
        // 会话 ID。
        const conversationId = Number(payload?.conversation_id);

        // 触发事件的用户。
        const eventUserId = Number(payload?.user_id);

        // 非法数据忽略。
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;

        // 如果事件是给别的用户的，就不处理。
        if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUserId)) return;

        // 删除消息后，重拉一次会话列表，确保预览和未读数正确。
        void loadConversations();
      },
    );

    // 监听会话删除。
    const offConversationDeleted = onRealtimeEvent(
      REALTIME_EVENTS.CHAT_CONVERSATION_DELETED,
      (payload) => {
        // 会话 ID。
        const conversationId = Number(payload?.conversation_id);

        // 触发事件的用户。
        const eventUserId = Number(payload?.user_id);

        // 非法数据忽略。
        if (!Number.isInteger(conversationId) || conversationId <= 0) return;

        // 只处理属于当前用户的删除事件。
        if (Number.isInteger(eventUserId) && Number(eventUserId) !== Number(currentUserId)) return;

        // 从列表里移除这个会话。
        setConversations((prev) =>
          prev.filter((conv) => Number(conv.conversation_id) !== conversationId),
        );
      },
    );

    // cleanup。
    return () => {
      offMessageDeleted();
      offConversationDeleted();
    };
  }, [currentUserId, loadConversations, setConversations]);

  // 如果父页面传进来“刚删掉某个会话”的状态，就在列表里移除它。
  useEffect(() => {
    // 没有 removedConversationId 就不处理。
    if (!removedConversationId) return;

    // 从列表里删掉这个会话。
    setConversations((prev) =>
      prev.filter(
        (conv) => Number(conv.conversation_id) !== Number(removedConversationId),
      ),
    );

    // 清掉 location.state，避免刷新后重复执行。
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, removedConversationId, setConversations]);

  // 监听对方在线状态变化。
  useEffect(() => {
    // 没有当前用户就不监听。
    if (!currentUserId) return undefined;

    // 监听 presence:update。
    const offPresenceUpdate = onRealtimeEvent("presence:update", (payload) => {
      // 对方的 user id。
      const targetUserId = Number(payload?.user_id);

      // 非法数据忽略。
      if (!Number.isInteger(targetUserId)) return;

      // 更新列表里对应对方用户的在线状态。
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

    // cleanup。
    return () => offPresenceUpdate();
  }, [currentUserId, setConversations]);

  // 如果父页面传进来“标记已读的会话 ID”，就把它的未读数清零。
  useEffect(() => {
    // 没有 markId 就不处理。
    if (!markId) return;

    // 找到对应会话，清空未读数。
    setConversations((prev) =>
      prev.map((conv) =>
        Number(conv.conversation_id) === markId
          ? { ...conv, unread_count: 0 }
          : conv,
      ),
    );

    // 清掉 location.state。
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, markId, navigate, setConversations]);
}
