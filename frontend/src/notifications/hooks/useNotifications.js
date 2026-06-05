import { createContext, useContext } from "react";

// Shared notification state for the notifications feature.
export const NotificationsContext = createContext(null);

// Read the current notifications feature state from context.
export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Fail fast so the hook is never used outside its provider.
    throw new Error("useNotifications must be used inside NotificationsProvider");
  }
  return ctx;
}
