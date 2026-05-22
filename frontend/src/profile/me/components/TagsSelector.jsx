import { Tags, LayersPlus } from "lucide-react";
import { secondaryButtonClass, selectClass } from "@/styles/UIClasses.jsx";
import { formatTag } from "@/utils/utils.js";

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
        <Tags size={14} aria-hidden="true" />
        <span>Interests tags</span>
      </label>

      {/* SELECT + BUTTON */}
      <div className="flex gap-2">
        <select
          value={selectedTag}
          onChange={(event) => setSelectedTag(event.target.value)}
          className={selectClass}
        >
          <option value="">Select an interest tag</option>
          {/* Sort tags alphabetically and render options */}
          {tagOptions
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((item) => (
              <option key={item.name} value={item.name}>
                {formatTag(item.name)}
              </option>
          ))}
        </select>

        {/* Add tag button */}
        <button
          type="button"
          onClick={() => addTag(selectedTag)}
          className={secondaryButtonClass}
          disabled={!selectedTag || tags.length >= 10}
        >
          <LayersPlus size={13} aria-hidden="true" className="mr-1" />
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
              className="inline-flex items-center gap-2 rounded-full bg-primary-light text-primary-dark border border-primary-dark text-xs px-3 py-1"
            >
              <span className="font-bold">
                {formatTag(tag)}
              </span>
              
              {/* Remove tag button */}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-primary-dark/80 hover:text-red hover:scale-105"
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