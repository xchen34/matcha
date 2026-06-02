/**
 * 列表底部状态徽章：显示“匹配/取消匹配/拉黑”这类关系状态提示。
 *
 * 说明：
 * - 这不是普通聊天消息，而是状态提示条。
 * - 通过 conversation 与时间判断，避免和真实消息时间顺序冲突。
 */
export default function ChatConversationStatusBadge({
  conversation,
  groupedMessages,
  messages,
  wasMatchedBefore,
  unmatchedAt,
}) {
  const otherUser = conversation?.other_user;
  const otherUsername = otherUser?.is_deleted ? "Deleted account" : otherUser?.username;
  const isDeleted = Boolean(otherUser?.is_deleted);

  const matchCreatedAt = conversation?.match_created_at
    ? new Date(conversation.match_created_at)
    : null;
  const matchedDate = matchCreatedAt ? matchCreatedAt.toLocaleDateString("en-GB") : "";
  const matchedTime = matchCreatedAt
    ? matchCreatedAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const unmatchedDate = unmatchedAt ? unmatchedAt.toLocaleDateString("en-GB") : "";
  const unmatchedTime = unmatchedAt
    ? unmatchedAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // 兼容历史数据：如果曾经匹配过，或消息里出现“已取消匹配”文案，也视为有取消匹配状态。
  const hasUnmatchMessage =
    wasMatchedBefore || messages.some((msg) => msg.content?.includes("You are no longer matched"));

  if (isDeleted) {
    return (
      <li className="py-3 text-center">
        <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700">
          Conversation with deleted account
        </span>
      </li>
    );
  }

  // 你拉黑了对方。
  if (conversation?.blocked_by_you) {
    return (
      <li className="py-3 text-center">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You blocked {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  // 对方拉黑了你。
  if (conversation?.blocked_you) {
    return (
      <li className="py-3 text-center">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You&apos;ve been blocked by {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  // 仍是匹配关系：在列表底部补充“匹配时间”提示。
  if (
    conversation?.is_match &&
    matchCreatedAt &&
    (groupedMessages.length === 0 ||
      matchCreatedAt >= new Date(groupedMessages[groupedMessages.length - 1]?.msg?.created_at))
  ) {
    return (
      <li className="py-3 text-center">
        <span className="inline-flex rounded-full border border-green-300 bg-green-100 px-4 py-2 text-xs font-medium text-green-800">
          You matched with {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  // 已取消匹配：显示取消匹配提示（若时间上应出现在列表底部）。
  if (
    !conversation?.is_match &&
    hasUnmatchMessage &&
    (groupedMessages.length === 0 ||
      !unmatchedAt ||
      new Date(unmatchedAt) >= new Date(groupedMessages[groupedMessages.length - 1]?.msg?.created_at))
  ) {
    return (
      <li className="py-3 text-center">
        <span className="inline-flex rounded-full border border-yellow-300 bg-yellow-100 px-4 py-2 text-xs font-medium text-yellow-800">
          You unmatched with {"@" + otherUsername} on {unmatchedDate} at {unmatchedTime}
        </span>
      </li>
    );
  }

  return null;
}
