import { FiTag } from "react-icons/fi";
import { FieldLabel } from "./FieldLabel.jsx";

export default function ProfileTags({ tags }) {
  return (
    <div>
      <FieldLabel icon={FiTag}>Tags</FieldLabel>
      <div className="mt-1 flex flex-wrap gap-2">
        {Array.isArray(tags) && tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-xs text-white">
              {tag}
            </span>
          ))
        ) : (
          <p className="text-slate-800">-</p>
        )}
      </div>
    </div>
  );
}