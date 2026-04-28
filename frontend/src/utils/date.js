export const MIN_BIRTH_DATE_ISO = (() => {
    const now = new Date();
    const year = now.getFullYear() - 100;
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
})();

export function getMaxAdultBirthDateIso() {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(date.getUTCFullYear() - 18);
    return date.toISOString().slice(0, 10);
}

export function isValidBirthDateIso(value, minIso, maxIso) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

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