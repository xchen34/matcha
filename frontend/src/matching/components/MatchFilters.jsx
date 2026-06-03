import { RangeSlider } from "@/utils/components/RangeSlider";
import { FormInput, SelectField } from "@/utils/components";
import TagSelector from "./TagSelector.jsx";
import { primaryButtonClass, secondaryButtonClass } from "@/styles/UIClasses.jsx";
import { 
  Search, MapPin, 
  UserRound, Star, 
  ArrowDownUp, ArrowDownWideNarrow, 
  Tags, Check, RotateCw 
} from "lucide-react"
import { formatTag } from "@/utils/utils.js";
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
      {/* ======== USERNAME ======== */}
      <FormInput
        wrapperClassName="col-span-2"
        label="Search username"
        icon={Search}
        name="username"
        value={draftFilters.username}
        onChange={handleFilterChange}
        placeholder="Search by username"
      />

      {/* ======== CITY ======== */}
      <div className="relative col-span-2">
        <FormInput
          label="City"
          icon={MapPin}
          name="city"
          value={draftFilters.city}
          onChange={handleFilterChange}
          placeholder="Type and choose a city"
          className={cityConfirmed ? "border-green-500" : ""}
        />

        {/* City suggestions dropdown */}
        {!cityConfirmed && citySuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-white p-1 shadow-lg">
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

        {cityConfirmed && draftFilters.city.trim() && (
          <p className="mt-1 text-[11px] text-green-700">City validated.</p>
        )}
      </div>

      {/* ======== AGE ======== */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <UserRound size={16} />
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Age</span>
          </div>
          <span>{draftFilters.min_age} – {draftFilters.max_age}</span>
        </label>

        {/* Age range slider */}
        <div className="px-2">
          <RangeSlider
            min={18}
            max={100}
            value={[draftFilters.min_age, draftFilters.max_age]}
            onChange={handleAgeSliderChange}
          />
        </div>
      </div>

      {/* ======== FAME ======== */}
      <div className="flex flex-col gap-2 col-span-2">
        <label className="flex items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <Star size={16} />
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">Popularity</span>
          </div>
          <span>{draftFilters.min_fame} – {draftFilters.max_fame}</span>
        </label>

        {/* Fame range slider */}
        <div className="px-2">
          <RangeSlider
            min={0}
            max={100}
            value={[draftFilters.min_fame, draftFilters.max_fame]}
            onChange={handleFameSliderChange}
          />
        </div>
      </div>

      {/* ======== SORT ======== */}
      <SelectField
        wrapperClassName="col-span-2"
        label="Sort by"
        icon={ArrowDownUp}
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

      {/* ======== ORDER ======== */}
      <SelectField
        wrapperClassName="col-span-2"
        label="Order"
        icon={ArrowDownWideNarrow}
        name="sort_dir"
        value={draftFilters.sort_dir}
        onChange={handleFilterChange}
        options={[
          { value: "desc", label: "Descending" },
          { value: "asc", label: "Ascending" },
        ]}
      />

      {/* TAGS */}
      <div className="flex flex-col gap-2 sm:col-span-2 lg:col-span-4">
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Tags size={16} />
          <span>Interest tags</span>
        </label>

        {/* Tag selector */}
        <TagSelector
          tags={tagOptions.map(formatTag)}
          selectedTags={draftFilters.tags.map(formatTag)}
          onToggle={toggleTag}
        />
      </div>
    </div>

    {/* ======== ACTIONS BUTTONS ======== */}
    <div className="flex gap-3 flex-wrap">
      {/* Apply filters button */}
      <button
        type="button"
        onClick={applyFilters}
        className={primaryButtonClass}
      >
        <Check size={16} aria-hidden="true" />
        <span className="ml-1">Apply filters</span>
      </button>

      {/* Reset filters button */}
      <button
        type="button"
        onClick={resetFilters}
        className={secondaryButtonClass}
      >
        <RotateCw size={16} aria-hidden="true" />
        <span className="ml-1">Reset</span>
      </button>
    </div>

    {/* ======== ERROR MESSAGE ======== */}
    {filterError && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {filterError}
      </div>
    )}
    </>
  );
}