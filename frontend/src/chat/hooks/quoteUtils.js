// 把文本里的换行和多余空白整理成适合预览的短文本。
function normalizePreviewText(text) {
  return String(text || "")
    // Windows 换行统一成 \n。
    .replace(/\r\n/g, "\n")
    // 所有连续空白压成一个空格。
    .replace(/\s+/g, " ")
    // 去掉首尾空白。
    .trim();
}

// 解析“引用 + 回复正文”的消息内容。
// 返回值会拆成：
// - quoteHeader: 引用头部
// - quoteLines: 引用内容行
// - replyText: 真正回复的正文
export function parseQuotedMessageContent(content) {
  // 先把输入统一转成字符串。
  const text = String(content || "");

  // 按行切开，方便识别引用格式。
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  // 如果根本没有行，就直接返回空结构。
  if (!lines.length) {
    return { quoteHeader: null, quoteLines: [], replyText: text };
  }

  // 是否检测到引用格式。
  let isQuote = false;

  // 引用头部文字。
  let headerText = "";

  // 检查第一行是不是 "X wrote:" 或者 "Replying to message #..."。
  const matchWrote = lines[0].match(/^(.*) wrote:\s*$/i);

  // 如果是 "X wrote:" 这种格式，就认为是引用。
  if (matchWrote) {
    isQuote = true;
    headerText = matchWrote[1].trim();
  } else if (lines[0].startsWith("Replying to message #")) {
    // 如果是本项目自己生成的引用格式，也认为是引用。
    isQuote = true;
    headerText = "Reply";
  }

  // 不是引用格式的话，直接把整段当成回复正文。
  if (!isQuote) {
    return { quoteHeader: null, quoteLines: [], replyText: text };
  }

  // 存放引用行。
  const quoteLines = [];

  // 从第 2 行开始处理。
  let index = 1;

  // 连续读取以 "> " 开头的行，直到引用块结束。
  while (index < lines.length) {
    const line = lines[index];

    // 不是引用行就停。
    if (!/^>\s?/.test(line)) break;

    // 去掉开头的 > 之后，放进 quoteLines。
    quoteLines.push(line.replace(/^>\s?/, ""));
    index += 1;
  }

  // 跳过引用块和正文之间的空行。
  while (index < lines.length && lines[index].trim() === "") {
    index += 1;
  }

  // 返回拆好的引用与正文。
  return {
    quoteHeader: headerText,
    quoteLines,
    replyText: lines.slice(index).join("\n").trim(),
  };
}

// 生成聊天列表里的引用预览文案。
export function formatQuotedMessagePreview(content, maxLength = 72) {
  // 先把内容解析成“引用 + 正文”的结构。
  const parsed = parseQuotedMessageContent(content);

  // 正文预览先压缩成单行。
  const replyText = normalizePreviewText(parsed.replyText);

  // 如果有真正的回复正文，就优先展示正文。
  if (replyText) {
    return replyText.length <= maxLength
      ? replyText
      : `${replyText.slice(0, maxLength).trimEnd()}…`;
  }

  // 如果没有正文，就展示引用内容。
  const quoteText = normalizePreviewText(parsed.quoteLines.join(" "));

  if (quoteText) {
    // 有引用头的话，把头部也带上。
    const preview = parsed.quoteHeader
      ? `${parsed.quoteHeader}: ${quoteText}`
      : quoteText;

    return preview.length <= maxLength
      ? preview
      : `${preview.slice(0, maxLength).trimEnd()}…`;
  }

  // 最后兜底：直接拿原文压缩成预览。
  const fallback = normalizePreviewText(content);

  return fallback.length <= maxLength
    ? fallback
    : `${fallback.slice(0, maxLength).trimEnd()}…`;
}
