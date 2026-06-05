import { useState } from "react";
import { formatDayLabel, formatTime } from "../utils/messageFormat.js";
import { CornerUpLeft, Trash2 } from "lucide-react";

/**
 * 单条消息组件（聊天页里的一行）
 *
 * 这个组件负责：
 * 1) 画出消息气泡（左/右对齐）
 * 2) 识别并渲染“引用内容”
 * 3) 在 hover/展开时显示时间、引用/删除按钮
 *
 * Props 字典（如何区分“值”与“函数”）：
 * - msg: object，当前消息对象（值）
 * - showDay: boolean，是否显示这条消息上方的日期分隔（值）
 * - isMine: boolean，这条消息是否是我发送的（值）
 * - conversation: object，当前会话数据（值）
 * - expandedMessageId: number|null，当前被展开的消息 ID（值）
 * - setExpandedMessageId: function，设置被展开消息 ID（函数）
 * - deletingMessageId: number|null，当前正在删除中的消息 ID（值）
 * - onQuote: function，点击“Quote”时触发（函数）
 * - onDelete: function，点击“Delete”时触发（函数）
 */
export default function ChatConversationMessage({
  msg,
  showDay,
  isMine,
  conversation,
  expandedMessageId,
  setExpandedMessageId,
  deletingMessageId,
  onQuote,
  onDelete,
}) {
  // 仅控制鼠标悬浮时是否显示“时间+动作区”。
  const [isHovered, setIsHovered] = useState(false);

  // 当前消息是否处于“展开状态”（用于显示操作按钮）。 如果expandedMessageId === msg.id，则当前消息处于展开状态；否则不展开。
  const isExpanded = expandedMessageId === msg.id;

  // 按换行切分消息内容，便于后面识别引用行和正文行。
  const lines = msg.content.split("\n");

  // 自己发的消息动作区靠右，他人消息动作区靠左。
  const alignmentClass = isMine ? "items-end" : "items-start";

  // quoteLines: 引用内容（以 "> " 开头的行）
  // normalLines: 正文内容（非引用行）
  const quoteLines = [];
  const normalLines = [];

  // 这段在做“消息内容解析”：
  // - 跳过系统化的“Replying to message #...”元信息
  // - "> " 前缀行视为引用
  // - 其他行视为普通正文
  for (const line of lines) {
    if (line.startsWith("Replying to message #")) continue;

    if (line.startsWith("> ")) {
      quoteLines.push(line.slice(2)); // 去掉 "> " 前缀后存到 quoteLines
    } else {
      normalLines.push(line); // 其他行存到 normalLines
    }
  }

  return (
    // 点击消息行外部区域时，收起当前展开态。
    <li onClick={() => setExpandedMessageId(null)}>
      <div className="space-y-1">
        {/* 日期分隔：只有 showDay=true 才显示（例如新的一天第一条消息） */}
        {showDay && (
          <div className="text-center text-[11px] text-slate-500">
            {formatDayLabel(msg.created_at)}
          </div>
        )}

        {/* 引用块：如果消息中有 quoteLines，则先渲染一块引用区域 */}
        {quoteLines.length > 0 && (
          <div className={`flex min-w-0 ${isMine ? "justify-end" : "justify-start"}`}>
            <div
              className={`min-w-0 max-w-[68%] border-l-4 px-2 py-1 rounded-2xl text-sm break-words whitespace-pre-wrap break-all
                ${
                  isMine
                    ? "border border-primary-medium bg-primary-light text-primary-dark"
                    : "border border-neutral-medium bg-slate-50 text-slate-600"
                }
            `}
            >
              <p className="text-xs font-medium">{quoteLines.join("\n")}</p>
            </div>
          </div>
        )}

        {/* 主消息气泡：自己发的靠右，别人发的靠左 */}
        <div className={`flex min-w-0 ${isMine ? "justify-end" : "justify-start"}`}>
          <div
            className={`min-w-0 max-w-[68%] rounded-2xl px-3 py-1.5 text-sm cursor-pointer transition-all break-words
              ${isMine ? "bg-primary text-white" : "bg-slate-200 text-neutral-dark"}
            `}
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
              // 阻止冒泡，避免触发外层 <li> 的“收起展开态”逻辑。
              e.stopPropagation();
              // 再次点击同一条可收起；点击新条目可切换展开目标。
              setExpandedMessageId(isExpanded ? null : msg.id);
            }}
          >
            {/* 正常情况下渲染解析后的正文；
                如果解析后正文为空，则回退显示原始 content。 */}
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

        {/* 动作区：hover 或展开时显示 */}
        {(isHovered || isExpanded) && (
          <div className={`flex flex-col ${alignmentClass} gap-2 mt-1 text-[11px] text-slate-500`}>
            {/* 时间戳 */}
            <span>{formatTime(msg.created_at)}</span>

            {/* 只有展开态才显示操作按钮（引用、删除） */}
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
