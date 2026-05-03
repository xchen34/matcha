export function TagSelector({ tags, selectedTags, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-white/70 backdrop-blur border border-white/50 shadow-sm">
      {tags.length === 0 ? (
        <span className="text-xs text-slate-500">No tags available.</span>
      ) : (
        tags
          .slice()
          .sort((a, b) => a.localeCompare(b))
          .slice(0, 24)
          .map(tag => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1
                  ${selected
                    ? "bg-orange-600 text-white shadow-md scale-105"
                    : "bg-gray-100 text-gray-600 hover:bg-orange-100 hover:text-orange-600"
                  }`}
              >
                {tag}
              </button>
            );
          })
      )}
    </div>
  );
}