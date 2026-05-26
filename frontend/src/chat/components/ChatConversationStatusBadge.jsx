export default function ChatConversationStatusBadge({
  conversation,
  groupedMessages,
  messages,
  wasMatchedBefore,
  unmatchedAt,
}) {
  const otherUsername = conversation?.other_user?.username;
  const matchCreatedAt = conversation?.match_created_at ? new Date(conversation.match_created_at) : null;
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
  const hasUnmatchMessage = wasMatchedBefore || messages.some((msg) => msg.content?.includes("You are no longer matched"));

  /* ========== YOU BLOCKED USER ========== */
  if (conversation?.blocked_by_you) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You blocked {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  /* ========== USER BLOCKED YOU ========== */
  if (conversation?.blocked_you) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You&apos;ve been blocked by {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  /* ========== MATCHED ========== */
  if (
    conversation?.is_match &&
    matchCreatedAt &&
    (groupedMessages.length === 0 || 
      matchCreatedAt >= 
        new Date(
          groupedMessages[
            groupedMessages.length - 1
          ]?.msg?.created_at,
      ))
  ) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-medium text-green-800 border border-green-300">
          You matched with {"@" + otherUsername} on {matchedDate} at {matchedTime}
        </span>
      </li>
    );
  }

  /* ========== UNMATCHED ========== */
  if (
    !conversation?.is_match &&
    hasUnmatchMessage &&
    (groupedMessages.length === 0 || 
      !unmatchedAt || 
      new Date(unmatchedAt) >= 
        new Date(
          groupedMessages[
            groupedMessages.length - 1
          ]?.msg?.created_at
        ))
  ) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full bg-yellow-100 px-4 py-2 text-xs font-medium text-yellow-800 border border-yellow-300">
          You unmatched with {"@" + otherUsername} on {unmatchedDate} at {unmatchedTime}
        </span>
      </li>
    );
  }

  return null;
}
