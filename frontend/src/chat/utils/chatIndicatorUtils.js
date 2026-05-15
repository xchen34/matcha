import { formatQuotedMessagePreview } from "../hooks/quoteUtils.js";
import { sanitizeText } from "@/utils/xssEscape.js";

/* Message preview formatting */
export function formatPreview(lastMessage) {
  if (!lastMessage?.content) return "No messages yet";
  return formatQuotedMessagePreview(lastMessage.content, 48);
}

/* User display name formatting */
export function toDisplayHandle(user) {
  const username = String(user?.username || "").trim().replace(/^@+/, "");
  if (username) {
    return `@${sanitizeText(username)}`;
  }
  return sanitizeText(`User ${user?.id ?? ""}`);
}

/* Avatar name formatting */
export function toAvatarName(user) {
  const username = String(user?.username || "").trim().replace(/^@+/, "");
  if (username) {
    return sanitizeText(username);
  }
  const firstName = String(user?.first_name || "").trim();
  if (firstName) {
    return sanitizeText(firstName);
  }
  return sanitizeText(`User ${user?.id ?? ""}`);
}