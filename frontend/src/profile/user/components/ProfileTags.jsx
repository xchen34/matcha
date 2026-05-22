import { Tags } from "lucide-react";
import { FieldLabel } from "./FieldLabel.jsx";
import { formatTag } from "@/utils/utils.js";

export default function ProfileTags({ tags }) {
  return (
    <div>
      {/* FIELD LABEL */}
      <FieldLabel icon={Tags}>Tags</FieldLabel>

      {/* TAGS LIST */}
      <div className="mt-1 flex flex-wrap gap-2">
        {Array.isArray(tags) && tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-1 text-xs text-primary-dark border border-primary">
              {formatTag(tag)}
            </span>
          ))
        ) : (
          // If no tags, show a placeholder
          <p className="text-slate-800">-</p>
        )}
      </div>
    </div>
  );
}