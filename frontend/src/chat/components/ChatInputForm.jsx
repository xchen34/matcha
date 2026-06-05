import { Trash2 } from "lucide-react";
import { parseQuotedMessageContent } from "../hooks/quoteUtils.js";
import { chatButtonClass, chatInputClass } from "@/styles/UIClasses.jsx";

const MAX_CHAT_MESSAGE_LENGTH = 500;

/**
 * 聊天输入区组件：负责输入、引用预览、发送按钮。
 *
 * Props 字典：
 * - canSend: boolean，当前是否允许发送（值）
 * - sending: boolean，是否正在发送（值）
 * - body: string，输入框内容（值）
 * - setBody: function，更新输入框内容（函数）
 * - quotedMessage: object|null，当前引用的消息（值）
 * - setQuotedMessage: function，设置/清空引用消息（函数）
 * - onSubmit: function，点击发送后的业务处理（函数）
 */
export default function ChatInputForm({
  canSend,
  sending,
  body,
  setBody,
  quotedMessage,
  setQuotedMessage,
  onSubmit,
}) {
  // 不可发送（如被拉黑/未匹配）时不渲染输入框。
  if (!canSend) return null;

  // 提交时把当前输入和引用信息交给父层处理。
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(body, quotedMessage, setBody, setQuotedMessage);
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t">
      {/* 有引用时，先显示“正在回复哪条消息”的预览 */}
      {quotedMessage && (
        <div className="mb-2 flex min-w-0 items-start justify-between gap-2 rounded-lg border border-l-4 border-primary-dark bg-primary-light p-2.5 text-xs text-slate-600 shadow-sm">
          <div className="min-w-0 flex-1 pr-2">
            <span className="mb-0.5 block font-semibold text-primary-dark">
              Replying to:
            </span>

            <p
              className="break-words break-all opacity-80"
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
              }}
            >
              {parseQuotedMessageContent(quotedMessage.content).replyText ||
                quotedMessage.content}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setQuotedMessage(null)}
            className="rounded-full p-1 text-primary-dark transition-colors hover:bg-primary hover:text-primary-light"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* 输入框 */}
      <textarea
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={chatInputClass}
        placeholder="Write a message..."
        disabled={sending}
        maxLength={MAX_CHAT_MESSAGE_LENGTH}
      />

      {/* 字数统计 + 发送按钮 */}
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-xs font-medium ${body.length >= MAX_CHAT_MESSAGE_LENGTH ? "text-red-500" : "text-slate-400"}`}
        >
          {body.length}/{MAX_CHAT_MESSAGE_LENGTH}
        </span>

        <button
          type="submit"
          disabled={sending || !body.trim() || body.length > MAX_CHAT_MESSAGE_LENGTH}
          className={chatButtonClass(
            sending || !body.trim() || body.length > MAX_CHAT_MESSAGE_LENGTH,
          )}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
