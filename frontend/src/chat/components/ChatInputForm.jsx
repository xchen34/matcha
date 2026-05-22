import { Trash2 } from "lucide-react";
import { parseQuotedMessageContent } from "../hooks/quoteUtils.js";
import { chatButtonClass, chatInputClass } from "@/styles/UIClasses.jsx";

const MAX_CHAT_MESSAGE_LENGTH = 500;

export default function ChatInputForm({
    canSend,
    sending,
    body,
    setBody,
    quotedMessage,
    setQuotedMessage,
    onSubmit,
}) {
    // Redirect if user cannot send messages (blocked, no permission, etc.)
    if (!canSend) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(body, quotedMessage, setBody, setQuotedMessage);
    };

    return (
        <form onSubmit={handleSubmit} className="shrink-0 border-t">
        {/* ========= QUOTED MESSAGE PREVIEW (IF ANY) ========== */}
        {quotedMessage && (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-l-4 border-primary-dark bg-primary-light p-2.5 text-xs text-slate-600 shadow-sm">
                <div className="flex-1 overflow-hidden pr-2">
                    <span className="block font-semibold text-primary-dark mb-0.5">
                    Replying to:
                    </span>

                    <p className="truncate opacity-80 break-all">
                    {parseQuotedMessageContent(quotedMessage.content).replyText ||
                        quotedMessage.content}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setQuotedMessage(null)}
                    className="text-primary-dark hover:text-primary-light p-1 rounded-full hover:bg-primary transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        )}

        {/* ========= MESSAGE INPUT ========== */}
        <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={chatInputClass}
            placeholder="Write a message..."
            disabled={sending}
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
        />

        {/* ========= CHARACTER COUNT & SEND BUTTON ========= */}
        <div className="flex items-center justify-between mt-2">
            <span
            className={`text-xs font-medium ${body.length >= MAX_CHAT_MESSAGE_LENGTH ? "text-red-500" : "text-slate-400"}`}
            >
            {body.length}/{MAX_CHAT_MESSAGE_LENGTH}
            </span>

            <button
                type="submit"
                disabled={
                    sending ||
                    !body.trim() ||
                    body.length > MAX_CHAT_MESSAGE_LENGTH
                }
                className={chatButtonClass(
                    sending ||
                    !body.trim() ||
                    body.length > MAX_CHAT_MESSAGE_LENGTH,
                )}
            >
                {sending ? "Sending…" : "Send"}
            </button>
        </div>
    </form>
  );
}
