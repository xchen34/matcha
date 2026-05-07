export const STORAGE_KEY = "matcha.currentUser";

export function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const userId = parsed?.id ?? parsed?.user_id ?? parsed?.userId;
    if (!parsed || !Number.isInteger(Number(userId))) {
      return null;
    }

    return {
      ...parsed,
      id: Number(userId),
    };
  } catch {
    return null;
  }
}

export function writeStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
}
