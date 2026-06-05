import { sanitizeText } from "@/utils/xssEscape.js";
import { FieldLabel } from "./FieldLabel.jsx";
import { formatLastSeen } from "@/utils/date.js";
import { Activity, Calendar, Compass, MapPin, User } from "lucide-react";
import { capitalizeFirst } from "@/utils/utils.js";

export default function ProfileInfoGrid({ user, profile }) {
  return (
    <div className="h-full space-y-3 rounded-xl bg-white/70 p-4">
      {/* GENDER*/}
      <div>
        <FieldLabel icon={User}>Gender</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(capitalizeFirst(profile.gender)) || "-"}</p>
      </div>

      {/* SEXUAL PREFERENCE */}
      <div>
        <FieldLabel icon={Compass}>Sexual preference</FieldLabel>
        <p className="mt-1 text-slate-800">{sanitizeText(capitalizeFirst(profile.sexual_preference)) || "-"}</p>
      </div>

      {/* AGE */}
      <div>
        <FieldLabel icon={Calendar}>Age</FieldLabel>
        <p className="mt-1 text-slate-800">{profile.age ?? "-"}</p>
      </div>

      {/* STATUS (online/offline)*/}
      <div className="space-y-2 pt-1">
        <FieldLabel icon={Activity}>Status</FieldLabel>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`
              inline-flex items-center rounded-full px-2 py-1
              text-[11px] font-semibold border
              transition
              ${
                user.is_online
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }
            `}
          >
            <span
              className={`
                mr-2 h-2 w-2 rounded-full
                ${user.is_online ? "bg-emerald-500" : "bg-slate-400"}
              `}
            />
            {user.is_online ? "Online" : "Offline"}
          </span>

          {/* Last seen (if offline) */ }
          <span className="text-xs text-slate-500">
            Last connection:{" "}
            <span className="text-slate-700 font-medium">
              {user.is_online ? "Now" : formatLastSeen(user.last_seen_at)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}