import { FaSearch, FaMapMarkerAlt, FaUser, FaStar, FaSort, FaArrowDown, FaTag, FaCheck, FaRedo } from "react-icons/fa";
import { RangeSlider } from "./RangeSlider";
import { SelectField } from "./SelectField";
import { TagSelector } from "./TagSelector";

export default function MatchFilters({
  draftFilters,
  handleFilterChange,
  handleAgeSliderChange,
  handleFameSliderChange,
  cityConfirmed,
  citySuggestions,
  applyCitySuggestion,
  tagOptions,
  toggleTag,
  applyFilters,
  resetFilters,
  filterError,
}) {
  return (
    <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

      {/* USERNAME */}
      <div className="relative flex flex-col gap-1 col-span-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <FaSearch size={12} />
          <span>Search username</span>
        </label>

        <input
          type="text"
          name="username"
          value={draftFilters.username}
          onChange={handleFilterChange}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="Search by username"
        />
      </div>

      {/* CITY */}
      <div className="flex flex-col gap-1 col-span-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <FaMapMarkerAlt size={12} />
          <span>City</span>
        </label>

        <div className="relative">
          <input
            type="text"
            name="city"
            value={draftFilters.city}
            onChange={handleFilterChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand ${
              cityConfirmed ? "border-green-500" : "border-slate-200"
            }`}
            placeholder="Type and choose a city"
          />

          {!cityConfirmed && citySuggestions.length > 0 && (
            <div className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
              {citySuggestions.map((item) => (
                <button
                  key={`${item.city}-${item.label}`}
                  type="button"
                  onClick={() => applyCitySuggestion(item.city)}
                  className="block w-full px-2 py-1.5 text-left text-xs hover:bg-slate-100"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {cityConfirmed && draftFilters.city.trim() && (
          <p className="text-[11px] text-green-700">City validated.</p>
        )}
      </div>

      {/* AGE */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <FaUser size={12} />
            <span>Age</span>
          </div>
          <span>{draftFilters.min_age} – {draftFilters.max_age}</span>
        </label>

        <div className="px-2">
          <RangeSlider
            min={18}
            max={100}
            value={[draftFilters.min_age, draftFilters.max_age]}
            onChange={handleAgeSliderChange}
          />
        </div>
      </div>

      {/* FAME */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <FaStar size={12} />
            <span>Popularity</span>
          </div>
          <span>{draftFilters.min_fame} – {draftFilters.max_fame}</span>
        </label>

        <div className="px-2">
          <RangeSlider
            min={0}
            max={100}
            value={[draftFilters.min_fame, draftFilters.max_fame]}
            onChange={handleFameSliderChange}
          />
        </div>
      </div>

      {/* SORT */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <FaSort size={12} />
          <span>Sort by</span>
        </label>

        <SelectField
          name="sort_by"
          value={draftFilters.sort_by}
          onChange={handleFilterChange}
          options={[
            { value: "", label: "Suggested smart ranking" },
            { value: "age", label: "Age" },
            { value: "location", label: "Location" },
            { value: "fame_rating", label: "Fame rating" },
            { value: "tags", label: "Tags" },
          ]}
        />
      </div>

      {/* ORDER */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <FaArrowDown size={12} />
          <span>Order</span>
        </label>

        <SelectField
          name="sort_dir"
          value={draftFilters.sort_dir}
          onChange={handleFilterChange}
          options={[
            { value: "desc", label: "Descending" },
            { value: "asc", label: "Ascending" },
          ]}
        />
      </div>

      {/* TAGS */}
      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <FaTag size={12} />
          <span>Interest tags</span>
        </label>

        <TagSelector
          tags={tagOptions}
          selectedTags={draftFilters.tags}
          onToggle={toggleTag}
        />
      </div>
    </div>

    <div className="flex gap-3 flex-wrap">
      <button
        type="button"
        onClick={applyFilters}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:-translate-y-0.5 transition"
      >
        <FaCheck size={12} aria-hidden="true" />
        <span className="ml-1">
          Apply filters
        </span>
      </button>
      <button
        type="button"
        onClick={resetFilters}
        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:-translate-y-0.5 transition"
      >
        <FaRedo size={12} aria-hidden="true" />
        <span className="ml-1">
          Reset
        </span>
      </button>
    </div>

    {filterError && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {filterError}
      </div>
    )}
    </>
  );
}