// Create a message for a notification card based on parameters
export function createCardMessage(primaryName, verb, count) {
  const others = Math.max(0, count - 1);
  
  if (others === 0) {
    return `${verb} you`;
  }
  
  return `and ${others} others ${verb} you`;
}

// Format a date string into "DD/MM/YYYY, HH:mm:ss" format
export function formatNotificationDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
