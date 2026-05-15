import { useEffect, useRef } from "react";

export function useChatScroll({
    messages,
    loadingMore,
    hasMore,
    loadOlder,
    currentUserId,
}) {
    const listRef = useRef(null);
    const prependingRef = useRef(null);

    /* ========== Auto-scroll to bottom on new messages ========== */
    useEffect(() => {
        const el = listRef.current;
        if (!el) return;

        if (prependingRef.current) return;

        const lastMsg = messages[messages.length - 1];
        const isMine = Number(lastMsg?.sender_user_id) === Number(currentUserId);
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

        if (isNearBottom || isMine) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, currentUserId]);

    /* ========== Load older messages on scroll ========== */
    const handleScroll = () => {
        const el = listRef.current;
        if (!el) return;

        if (el.scrollTop <= 40 && hasMore && !loadingMore) {
            loadOlder();
        }
    };

    /* ========== Maintain scroll position when prepending messages ========== */
    useEffect(() => {
        const el = listRef.current;
        if (!el || !prependingRef.current) return;

        const { top, height } = prependingRef.current;
        const newHeight = el.scrollHeight;
        el.scrollTop = top + (newHeight - height);

        prependingRef.current = null;
    }, [messages]);

    /* ========== Save scroll position before prepending messages ========== */
    const saveScrollPositionBeforePrepend = () => {
        const el = listRef.current;
        if (!el) return;

        prependingRef.current = {
            top: el.scrollTop,
            height: el.scrollHeight,
        };
    };

    return {
        listRef,
        handleScroll,
        saveScrollPositionBeforePrepend,
    };
}
