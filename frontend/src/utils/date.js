/* ========== Birth date constants and validation ========== */
// Minimum birth date to be considered valid (100 years old)
export const MIN_BIRTH_DATE_ISO = (() => {
    const now = new Date();
    const year = now.getFullYear() - 100;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    
    return `${year}-${month}-${day}`;
})();

// Max birth date to be considered an adult (18 years old)
export function getMaxAdultBirthDateIso() {
    const date = new Date();

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(date.getUTCFullYear() - 18);
    
    return date.toISOString().slice(0, 10);
}

// Validate birth date string in ISO format and check if it's within the allowed range.
export function isValidBirthDateIso(value, minIso, maxIso) {
    if (typeof value !== "string") return false;

    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    // Validate date exists in the given year/month
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return false;
    }

    const date = new Date(trimmed);
    const min = new Date(minIso);
    const max = new Date(maxIso);

    if (date < min || date > max) return false;
    
    return true;
}

/* ========== User interaction timestamps ========== */
export function getInteractionTimeMs(user, mode) {
    const rawValue = mode === "matches" ? user?.matched_at : user?.created_at;
    const ts = new Date(rawValue || 0).getTime();
    
    return Number.isNaN(ts) ? 0 : ts;
}

/* ========== Date formatting for display ========== */
export function formatDateTime(value) {
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

export function formatLastSeen(value) {
    if (!value) return "Unknown";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}