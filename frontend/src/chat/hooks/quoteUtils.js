function normalizePreviewText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseQuotedMessageContent(content) {
  const text = String(content || "");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  if (!lines.length) {
    return { quoteHeader: null, quoteLines: [], replyText: text };
  }

  let isQuote = false;
  let headerText = "";
  const matchWrote = lines[0].match(/^(.*) wrote:\s*$/i);
  if (matchWrote) {
    isQuote = true;
    headerText = matchWrote[1].trim();
  } else if (lines[0].startsWith('Replying to message #')) {
    isQuote = true;
    headerText = "Reply";
  }

  if (!isQuote) {
    return { quoteHeader: null, quoteLines: [], replyText: text };
  }

  const quoteLines = [];
  let index = 1;
  while (index < lines.length) {
    const line = lines[index];
    if (!/^>\s?/.test(line)) break;
    quoteLines.push(line.replace(/^>\s?/, ""));
    index += 1;
  }

  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  return {
    quoteHeader: headerText,
    quoteLines,
    replyText: lines.slice(index).join("\n").trim(),
  };
}

export function formatQuotedMessagePreview(content, maxLength = 72) {
  const parsed = parseQuotedMessageContent(content);
  const replyText = normalizePreviewText(parsed.replyText);

  if (replyText) {
    return replyText.length <= maxLength
      ? replyText
      : `${replyText.slice(0, maxLength).trimEnd()}…`;
  }

  const quoteText = normalizePreviewText(parsed.quoteLines.join(" "));
  if (quoteText) {
    const preview = parsed.quoteHeader
      ? `${parsed.quoteHeader}: ${quoteText}`
      : quoteText;
    return preview.length <= maxLength
      ? preview
      : `${preview.slice(0, maxLength).trimEnd()}…`;
  }

  const fallback = normalizePreviewText(content);
  return fallback.length <= maxLength
    ? fallback
    : `${fallback.slice(0, maxLength).trimEnd()}…`;
}