import { sanitizeText } from "@/utils/xssEscape.js";
import { FieldLabel } from "./FieldLabel.jsx";
import { formatLastSeen } from "@/utils/date.js";
import { Activity, Calendar, Compass, MapPin, User } from "lucide-react";

export default function ProfileInfoGrid({ user, profile, isOwnProfile }) {
  return (
    <div className="h-full space-y-3 rounded-xl bg-white/70 p-4">
      {/* GENDER*/}
      <div>
        <FieldLabel icon={User}>Gender</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(profile.gender) || "-"}</p>
      </div>

      {/* SEXUAL PREFERENCE */}
      <div>
        <FieldLabel icon={Compass}>Sexual preference</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(profile.sexual_preference) || "-"}</p>
      </div>

      {/* AGE */}
      <div>
        <FieldLabel icon={Calendar}>Age</FieldLabel>
        <p className="mt-1 text-slate-800">{profile.age ?? "-"}</p>
      </div>

      {/* BIRTH DATE - ONLY VISIBLE TO OWNER */}
      {isOwnProfile && (
        <div>
          <FieldLabel icon={Calendar}>Birth date</FieldLabel>
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

      {/* LOCATION */}
      <div>
        <FieldLabel icon={MapPin}>Location</FieldLabel>
        <p className="mt-1 text-slate-800">
          {sanitizeText(profile.city) || "-"} {profile.neighborhood ? `· ${sanitizeText(profile.neighborhood)}` : ""}
        </p>
      </div>

      {/* ONLINE STATUS */}
      <div>
        <FieldLabel icon={Activity}>Status</FieldLabel>
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