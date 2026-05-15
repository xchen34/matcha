import { useCallback, useState } from "react";
import {
    deleteChatConversation,
    deleteChatMessage,
    sendChatMessage,
} from "./api.js";
import { parseQuotedMessageContent } from "./quoteUtils.js";
import { dedupeMessages } from "../utils/messageFormat.js";

const MAX_CHAT_MESSAGE_LENGTH = 500;

export function useMessageActions(
    currentUser,
    conversation,
    setConversation,
    setMessages,
    setError,
    navigate,
) {
    const [sending, setSending] = useState(false);
    const [deletingConversation, setDeletingConversation] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState(null);

    /* ========== Send message ========== */
    const handleSend = useCallback(
        async (body, quotedMessage, setBody, setQuotedMessage) => {
            const currentUserId = Number(currentUser?.id) || null;
            const trimmed = String(body || "").trim();

            if (
                !trimmed ||
                !conversation?.other_user?.id ||
                !currentUserId
            ) return;

            let content = trimmed;

            /* If quoting, prepend the quote header and formatted quote text */
            if (quotedMessage?.content) {
                const parsed = parseQuotedMessageContent(quotedMessage.content);
                const actualQuoteText = parsed.replyText || quotedMessage.content;
                const quoteHeader = `Replying to message #${quotedMessage.id}:`;

                content = `${quoteHeader}\n> ${String(actualQuoteText).replace(/\n/g, "\n> ")}\n\n${trimmed}`;
            }

            setSending(true);
            setError("");

            try {
                const payload = await sendChatMessage(
                    { id: currentUserId },
                    Number(conversation.other_user.id),
                    content,
                );

                if (payload?.message) {
                    setMessages((prev) => dedupeMessages([...prev, payload.message]));
                }

                setBody("");
                setQuotedMessage(null);
            } catch (err) {
                setError(err?.message || "Unable to send message");
            } finally {
                setSending(false);
            }
        },
        [conversation, currentUser, setError, setMessages],
    );

    /* ========== Delete conversation ========== */
    const handleDeleteConversation = useCallback(async () => {
        const currentUserId = Number(currentUser?.id) || null;
        const activeConversationId = Number(conversation?.id) || null;

        if (!activeConversationId || !currentUserId) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this chat from your inbox? This only affects your side.",
        );

        if (!confirmed) return;

        setDeletingConversation(true);
        setError("");

        try {
            await deleteChatConversation({ id: currentUserId }, activeConversationId);

            navigate("/messages", {
                replace: true,
                state: { removedConversationId: activeConversationId },
            });
        } catch (err) {
            setError(err?.message || "Unable to delete conversation");
        } finally {
            setDeletingConversation(false);
        }
    }, [conversation, currentUser, navigate, setError]);

    /* ========== Delete message ========== */
    const handleDeleteMessage = useCallback(
        async (message, setQuotedMessage) => {
            const currentUserId = Number(currentUser?.id) || null;
            const activeConversationId = Number(conversation?.id) || null;

            if (!activeConversationId || !currentUserId || !message?.id) return;

            setDeletingMessageId(message.id);

            try {
                await deleteChatMessage(
                { id: currentUserId },
                activeConversationId,
                message.id,
                );

                /* Remove the deleted message from the list */
                setMessages((prev) =>
                    prev.filter((m) => Number(m.id) !== Number(message.id)),
                );

                /* If the deleted message is currently quoted, clear the quote */
                setQuotedMessage((prev) =>
                    Number(prev?.id) === Number(message.id) ? null : prev,
                );
            } finally {
                setDeletingMessageId(null);
            }
        },
        [conversation, currentUser, setMessages],
    );

    return {
        sending,
        deletingConversation,
        deletingMessageId,
        handleSend,
        handleDeleteConversation,
        handleDeleteMessage,
        MAX_CHAT_MESSAGE_LENGTH,
    };
}
