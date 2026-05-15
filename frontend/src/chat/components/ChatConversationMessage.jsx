import { useState } from "react";
import { formatDayLabel, formatTime } from "../utils/messageFormat.js";
import { CornerUpLeft, Trash2 } from "lucide-react"

export default function ChatConversationMessage({
  msg,
  showDay,
  currentUserId,
  conversation,
  expandedMessageId,
  setExpandedMessageId,
  deletingMessageId,
  onQuote,
  onDelete,
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isExpanded = expandedMessageId === msg.id;
  const isMine = msg.sender_user_id === currentUserId;
  const lines = msg.content.split("\n");

  const quoteLines = [];
  const normalLines = [];

  for (const line of lines) {
    if (line.startsWith("Replying to message #")) continue;

    if (line.startsWith("> ")) {
      quoteLines.push(line.slice(2));
    } else {
      normalLines.push(line);
    }
  }

  return (
    <li onClick={() => setExpandedMessageId(null)}>
      <div className="space-y-1">
        {/* ========== DATE ========== */}
        {showDay && (
          <div className="text-center text-[11px] text-slate-500">
            {formatDayLabel(msg.created_at)}
          </div>
        )}

        {/* ========== QUOTE BLOCK ========== */}
        {quoteLines.length > 0 && (
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
            <div
            className={`max-w-[68%] border-l-4 px-2 py-1 rounded-2xl text-sm break-words whitespace-pre-wrap break-all
                ${
                isMine
                  ? "border border-primary-medium bg-primary-light text-primary-dark"
                  : "border border-neutral-medium bg-slate-50 text-slate-600"
                }
            `}
            >
              <p className="text-xs font-medium">
                  {quoteLines.join("\n")}
              </p>
            </div>
          </div>
        )}

        {/* MESSAGE */}
        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
          <div
            className={`max-w-[68%] rounded-2xl px-3 py-2 text-sm cursor-pointer transition-all
              ${isMine ? "bg-primary text-white" : "bg-slate-300 text-neutral-dark"}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              setExpandedMessageId(isExpanded ? null : msg.id);
            }}
          >
            {normalLines.length > 0 ? (
              <p className="whitespace-pre-wrap break-words break-all hyphens-auto">
                {normalLines.join("\n").trim()}
              </p>
            ) : (
              <p className="whitespace-pre-wrap break-words break-all hyphens-auto">
                {msg.content}
              </p>
            )}
          </div>
        </div>

        {/* ========== ACTIONS ========== */}
        {(isHovered || isExpanded) && (
          <div
            className={`flex flex-col items-${isMine ? "end" : "start"} gap-2 text-[11px] mt-1 text-slate-500`}
          >
            {/* TIMESTAMP */ }
            <span>{formatTime(msg.created_at)}</span>

            { /* ACTION BUTTONS (QUOTE, DELETE) */ }
            {isExpanded && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onQuote(msg)}
                  className="inline-flex items-center gap-1 border border-neutral hover:bg-slate-100 rounded-[10px] px-1"
                >
                  <CornerUpLeft size={10} /> Quote
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(msg)}
                  disabled={deletingMessageId === msg.id}
                  className="inline-flex items-center gap-1 border border-red-500 rounded-[10px] px-1 text-red-500 hover:bg-red-100"
                >
                  <Trash2 size={10} />
                  {deletingMessageId === msg.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}