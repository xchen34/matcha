export const STORAGE_KEY = "matcha.currentUser";

/* ========== Read stored user data from local storage ========== */
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

/* ========== Write user data to local storage ========== */
export function writeStoredUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

/* ========== Clear stored user data from local storage ========== */
export function clearStoredUser() {
  localStorage.removeItem(STORAGE_KEY);
}
