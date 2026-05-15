import { useCallback, useState } from "react";
import { fetchConversationMessages, markConversationAsRead } from "./api.js";
import { dedupeMessages } from "../utils/messageFormat.js";

const PAGE_SIZE = 18;

export function useConversationData(currentUser, conversationId) {
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState("");
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [wasMatchedBefore, setWasMatchedBefore] = useState(false);
    const [unmatchedAt, setUnmatchedAt] = useState(null);

    const loadConversation = useCallback(async () => {
        if (!currentUser?.id || !conversationId) return;

        setLoading(true);
        setError("");

        try {
            const data = await fetchConversationMessages(currentUser, conversationId, {
                limit: PAGE_SIZE,
                offset: 0,
            });

            const nextMessages = dedupeMessages(data?.messages || []);
            const conv = data?.conversation || null;

            setConversation(conv);
            setMessages(nextMessages);

            /* Check if conversation has an "unmatch" message */
            const hasUnmatchMessage = nextMessages.some((msg) =>
                msg.content?.includes("You are no longer matched"),
            );
            if (hasUnmatchMessage && !conv?.is_match) {
                setWasMatchedBefore(true);
                setUnmatchedAt(new Date());
            }

            setOffset(nextMessages.length);
            setHasMore(Boolean(data?.paging?.has_more));

            /* Mark conversation as read on load */
            if (conv?.id) {
                await markConversationAsRead(currentUser, conv.id).catch(() => {});
            }
        } catch (err) {
            setError(err?.message || "Unable to load conversation");
        } finally {
            setLoading(false);
        }
    }, [conversationId, currentUser]);

    /* ========== Load older messages ========== */
    const loadOlder = useCallback(
        async (listRef, saveScrollPositionBeforePrepend) => {
            if (!currentUser?.id || !conversationId || !hasMore || loadingMore)
                return;

            const listEl = listRef.current;
            if (!listEl) return;

            setLoadingMore(true);
            saveScrollPositionBeforePrepend();

            try {
                const data = await fetchConversationMessages(
                    currentUser,
                    conversationId,
                    { limit: PAGE_SIZE, offset },
                );

                const olderMessages = dedupeMessages(data?.messages || []);

                if (olderMessages.length > 0) {
                    setMessages((prev) => dedupeMessages([...olderMessages, ...prev]));
                    setOffset((prev) => prev + olderMessages.length);
                }

                setHasMore(Boolean(data?.paging?.has_more));
            } finally {
                setLoadingMore(false);
            }
        },
        [conversationId, currentUser, hasMore, loadingMore, offset],
    );

    return {
        loading,
        loadingMore,
        error,
        setError,
        conversation,
        setConversation,
        messages,
        setMessages,
        hasMore,
        wasMatchedBefore,
        setWasMatchedBefore,
        unmatchedAt,
        setUnmatchedAt,
        loadConversation,
        loadOlder,
    };
}
