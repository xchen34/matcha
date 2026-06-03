import { Tags, LayersPlus } from "lucide-react";
import { secondaryButtonClass } from "@/styles/UIClasses.jsx";
import { SelectField } from "@/utils/components";
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
      <label className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
        <Tags size={14} aria-hidden="true" />
        <span>Interests tags</span>
      </label>

      {/* SELECT + BUTTON */}
      <div className="flex gap-2">
        <SelectField
          wrapperClassName="flex-1"
          value={selectedTag}
          onChange={(event) => setSelectedTag(event.target.value)}
          options={[
            { value: "", label: "Select an interest tag" },
            ...tagOptions
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((item) => ({
                value: item.name,
                label: formatTag(item.name),
              })),
          ]}
        />

        {/* Add tag button */}
        <button
          type="button"
          onClick={() => addTag(selectedTag)}
          className={secondaryButtonClass}
          disabled={!selectedTag || tags.length >= 10}
        >
          <LayersPlus size={16} aria-hidden="true" className="mr-1" />
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