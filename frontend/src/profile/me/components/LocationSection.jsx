import { LoaderCircle, MapPin, Navigation, PencilLine } from "lucide-react";
import { secondaryButtonClass } from "@/styles/UIClasses.jsx";
import { FormInput, SelectField } from "@/utils/components";

export default function LocationSection({
  form,
  handleChange,
  handleCityInputChange,
  cityAutocompleteOptions,
  applyCitySuggestion,
  isCitySuggestionsOpen,
  setIsCitySuggestionsOpen,
  isCitySelected,
  isNeighborhoodSelected,
  neighborhoodByCityOptions,
  loadingNeighborhoods,
  locationValidation,
  validatingLocation,
  handleEditLocation,
  useCurrentLocation,
  loadingGeo,
  hasCityInput,
}) {
  return (
    <>
      {/* TITLE */}
      <div className="space-y-1">
        <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-slate-500 font-semibold">
          <MapPin size={13} aria-hidden="true" />
          <span>Location</span>
          <span className="text-primary-dark">*</span>
        </p>
      </div>

      {/* GPS */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="gps_consent"
            checked={form.gps_consent}
            onChange={handleChange}
          />
          I consent to GPS-based location
        </label>

        {/* Use current location button */}
        <button
          type="button"
          className={"text-primary-dark font-semibold border border-primary rounded-full px-2 py-1 text-xs cusrsor-pointer hover:scale-105"}
          onClick={useCurrentLocation}
          disabled={loadingGeo || !form.gps_consent}
        >
          <span className="inline-flex items-center gap-2">
            <Navigation size={14} className="text-primary-dark" />
            {loadingGeo ? "Locating..." : "Use my position"}
          </span>
        </button>

        {/* GPS consent info text */}
        {!form.gps_consent ? (
          <span className="text-xs text-slate-500">
            Enable GPS consent to auto-fill your location.
          </span>
        ) : (
          <span className="text-xs text-primary-dark block w-full mt-1">
            GPS consent activate : click on "Use my position" and allow location access in your browser.
            <br />
            Verify the detected city/neighborhood before saving, edit if needed.
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* CITY */}
        <div className="space-y-1">
          <div className="relative flex gap-2">
            {/* City input */}
            <FormInput
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleCityInputChange}
              wrapperClassName="flex-1"
              className={`flex-1 ${
                isNeighborhoodSelected || form.gps_consent ? "opacity-60" : ""
              }`}
              onFocus={() => !isNeighborhoodSelected && setIsCitySuggestionsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsCitySuggestionsOpen(false), 120);
              }}
              autoComplete="new-password"
              disabled={isNeighborhoodSelected || form.gps_consent}
              required
            />

            {/* Edit button */}
            {(isNeighborhoodSelected || form.gps_consent) && (
              <button
                type="button"
                onClick={handleEditLocation}
                className={secondaryButtonClass}
              >
              <PencilLine size={13} aria-hidden="true" className="mr-1" />
                Edit
              </button>
            )}

            {/* City autocomplete suggestions */}
            {isCitySuggestionsOpen && cityAutocompleteOptions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-lg pointer-events-auto">
                {cityAutocompleteOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applyCitySuggestion(option);
                    }}
                    onClick={() => applyCitySuggestion(option)}
                    className="block w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-primary-light border-b last:border-b-0 border-slate-100"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* City validation status */}
          {(form.city || "").trim().length > 0 && !isNeighborhoodSelected && (
            <p
              className={`text-xs ${
                locationValidation?.city_exists
                  ? "text-emerald-700"
                  : "text-primary-dark"
              }`}
            >
              {validatingLocation ? (
                <span className="inline-flex items-center gap-1.5">
                  <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                  Checking city...
                </span>
              ) : locationValidation?.city_exists ? (
                "✓ City verified"
              ) : (
                "City not verified yet"
              )}
            </p>
          )}

          {/* Neighborhood validation status (only if city is selected) */}
          {isNeighborhoodSelected && (
            <p className="text-xs text-emerald-700">
              ✓ {form.city} - confirmed
            </p>
          )}
        </div>

        {/* NEIGHBORHOOD */}
        <div className="space-y-1">
          {/* Dropdown select for neighborhood, disabled if no city selected */}
          <div className="relative">
            <SelectField
              name="neighborhood"
              value={form.neighborhood}
              onChange={handleChange}
              className={`${
                isCitySelected ? "" : "opacity-60 cursor-not-allowed"
              } ${form.gps_consent ? "opacity-60" : ""}`}
              disabled={
                !isCitySelected ||
                loadingNeighborhoods ||
                neighborhoodByCityOptions.length === 0 ||
                form.gps_consent
              }
              options={[
                {
                  value: "",
                  label: isCitySelected
                    ? "Select neighborhood (optional)"
                    : "Select a valid city first",
                },
                ...neighborhoodByCityOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
            />
          </div>

          {/* Helper texts based on neighborhood selection status */}
          {!hasCityInput && (
            <p className="text-xs text-slate-500">
              Enter a city first to unlock neighborhood.
            </p>
          )}

          {hasCityInput && !isCitySelected && (
            <p className="text-xs text-slate-500">
              Confirm a valid city first to unlock neighborhood suggestions.
            </p>
          )}

          {isCitySelected && neighborhoodByCityOptions.length === 0 && (
            <p className="text-xs text-slate-500">
              {loadingNeighborhoods
                ? (
                  <span className="inline-flex items-center gap-1.5">
                    <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
                    Loading neighborhoods...
                  </span>
                )
                : "No neighborhoods available yet for this city."}
            </p>
          )}

          {/* Neighborhood validation status */}
          {(form.neighborhood || "").trim().length > 0 && (
            <p
              className={`text-xs ${
                locationValidation?.neighborhood_exists
                  ? "text-emerald-700"
                  : "text-primary-dark"
              }`}
            >
              {validatingLocation
                ? "Checking neighborhood..."
                : locationValidation?.neighborhood_exists
                ? "✓ Neighborhood verified"
                : "Neighborhood not verified yet"}
            </p>
          )}

          {/* Helper text for neighborhood selection*/}
          {isCitySelected && !isNeighborhoodSelected && (
            <p className="text-xs text-slate-500">
              Neighborhood is optional, but helps with better precision.
            </p>
          )}
        </div>
      </div>
    </>
  );
}