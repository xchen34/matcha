export default function ChatConversationStatusBadge({
  conversation,
  groupedMessages,
  messages,
  wasMatchedBefore,
  unmatchedAt,
}) {
  const otherUsername = conversation?.other_user?.username;
  const matchCreatedAt = conversation?.match_created_at ? new Date(conversation.match_created_at) : null;
  const hasUnmatchMessage = wasMatchedBefore || messages.some((msg) => msg.content?.includes("You are no longer matched"));

  if (conversation?.blocked_by_you) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You blocked @{otherUsername} on {matchCreatedAt.toLocaleDateString('en-GB')} at {matchCreatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </li>
    );
  }

  if (conversation?.blocked_you) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-4 py-2 text-xs font-medium text-red-800">
          You've been blocked by @{otherUsername} on {matchCreatedAt.toLocaleDateString('en-GB')} at {matchCreatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </li>
    );
  }

  if (
    conversation?.is_match &&
    matchCreatedAt &&
    (groupedMessages.length === 0 || matchCreatedAt >= new Date(groupedMessages[groupedMessages.length - 1]?.msg?.created_at))
  ) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-medium text-green-800 border border-green-300">
          You matched with @{otherUsername} on {matchCreatedAt.toLocaleDateString('en-GB')} at {matchCreatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </li>
    );
  }

  if (
    !conversation?.is_match &&
    hasUnmatchMessage &&
    (groupedMessages.length === 0 || !unmatchedAt || new Date(unmatchedAt) >= new Date(groupedMessages[groupedMessages.length - 1]?.msg?.created_at))
  ) {
    return (
      <li className="text-center py-3">
        <span className="inline-flex rounded-full bg-red-100 px-4 py-2 text-xs font-medium text-red-800 border border-red-300">
          You unmatched with @{otherUsername} on {unmatchedAt ? `${unmatchedAt.toLocaleDateString('en-GB')} at ${unmatchedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ""}
        </span>
      </li>
    );
  }

  return null;
}
