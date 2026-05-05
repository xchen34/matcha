import { FiTag } from "react-icons/fi";
import { secondaryButtonClass, selectClass } from "@/styles/UIClasses.jsx";

export default function TagsSelector({
  tagOptions,
  selectedTag,
  setSelectedTag,
  addTag,
  removeTag,
  tags,
}) {
  return (
    <div className="space-y-2">
      {/* LABEL */}
      <label className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <FiTag size={14} aria-hidden="true" />
        <span>Interests (tags)</span>
      </label>

      {/* SELECT + BUTTON */}
      <div className="flex gap-2">
        <select
          value={selectedTag}
          onChange={(event) => setSelectedTag(event.target.value)}
          className={selectClass}
        >
          <option value="">Select an interest tag</option>
          {tagOptions
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => addTag(selectedTag)}
          className={secondaryButtonClass}
          disabled={!selectedTag || tags.length >= 10}
        >
          Add
        </button>
      </div>

      {/* COUNTER */}
    <p className="text-xs text-slate-500 flex items-center gap-2">
    <span>{tags.length}/10 tags selected</span>

    {tags.length >= 10 && (
        <span className="text-red-500">
        (Maximum reached)
        </span>
    )}
    </p>
      {/* TAG LIST */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white text-xs px-3 py-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-white/80 hover:text-white"
                aria-label={`Remove ${tag}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      
    </div>
  );
}