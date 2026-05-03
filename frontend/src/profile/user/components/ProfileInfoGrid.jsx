import { FiActivity, FiCalendar, FiCompass, FiMapPin, FiUser } from "react-icons/fi";
import { sanitizeText } from "../../../utils/xssEscape.js";
import { FieldLabel } from "./FieldLabel.jsx";
import { formatLastSeen } from "../../../utils/date.js";

export default function ProfileInfoGrid({ user, profile, isOwnProfile }) {
  return (
    <div className="h-full space-y-3 rounded-xl bg-white/70 p-4">
      <div>
        <FieldLabel icon={FiUser}>Gender</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(profile.gender) || "-"}</p>
      </div>

      <div>
        <FieldLabel icon={FiCompass}>Sexual preference</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(profile.sexual_preference) || "-"}</p>
      </div>

      <div>
        <FieldLabel icon={FiCalendar}>Age</FieldLabel>
        <p className="mt-1 text-slate-800">{profile.age ?? "-"}</p>
      </div>

      {isOwnProfile && (
        <div>
          <FieldLabel icon={FiCalendar}>Birth date</FieldLabel>
          <p className="mt-1 text-slate-800">
            {profile.birth_date
              ? (() => {
                  const [y, m, d] = profile.birth_date.split("-");
                  if (!y || !m || !d) return "-";
                  const date = new Date(Number(y), Number(m) - 1, Number(d));
                  return date.toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  });
                })()
              : "-"}
          </p>
        </div>
      )}

      <div>
        <FieldLabel icon={FiMapPin}>Location</FieldLabel>
        <p className="mt-1 text-slate-800">
          {sanitizeText(profile.city) || "-"} {profile.neighborhood ? `· ${sanitizeText(profile.neighborhood)}` : ""}
        </p>
      </div>

      <div>
        <FieldLabel icon={FiActivity}>Status</FieldLabel>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-6">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              user.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
            }`}
          >
            {user.is_online ? "Online" : "Offline"}
          </span>
          <span className="text-sm text-slate-800">
            Last connection: {user.is_online ? "Now" : formatLastSeen(user.last_seen_at)}
          </span>
        </div>
      </div>
    </div>
  );
}