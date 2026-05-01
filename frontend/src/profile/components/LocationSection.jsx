import { FiMapPin } from "react-icons/fi";
import { FaLocationArrow } from "react-icons/fa";
import { secondaryButtonClass, inputClass, selectClass } from "../../styles/UIClasses.jsx";

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
          <FiMapPin size={13} aria-hidden="true" />
          <span>
            Location<span className="text-red-600">*</span>
          </span>
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

        <button
          type="button"
          className={secondaryButtonClass}
          onClick={useCurrentLocation}
          disabled={loadingGeo || !form.gps_consent}
        >
          <span className="inline-flex items-center gap-2">
            <FaLocationArrow className="text-slate-700" />
            {loadingGeo ? "Locating..." : "Use my position"}
          </span>
        </button>

        {!form.gps_consent ? (
          <span className="text-xs text-slate-500">
            Enable GPS consent to auto-fill your location.
          </span>
        ) : (
          <span className="text-xs text-red-600 block w-full mt-1">
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
            <input
              name="city"
              placeholder="City"
              value={form.city}
              onChange={handleCityInputChange}
              onFocus={() => !isNeighborhoodSelected && setIsCitySuggestionsOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsCitySuggestionsOpen(false), 120);
              }}
              className={`${inputClass} flex-1 ${
                cityAutocompleteOptions.length > 0 ? "rounded-b-none" : ""
              } ${
                isNeighborhoodSelected || form.gps_consent ? "opacity-60" : ""
              }`}
              autoComplete="new-password"
              disabled={isNeighborhoodSelected || form.gps_consent}
              required
            />

            {(isNeighborhoodSelected || form.gps_consent) && (
              <button
                type="button"
                onClick={handleEditLocation}
                className={secondaryButtonClass}
              >
                Edit
              </button>
            )}

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
                    className="block w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 border-b last:border-b-0 border-slate-100"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(form.city || "").trim().length > 0 && !isNeighborhoodSelected && (
            <p
              className={`text-xs ${
                locationValidation?.city_exists
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {validatingLocation
                ? "Checking city..."
                : locationValidation?.city_exists
                ? "✓ City verified"
                : "City not verified yet"}
            </p>
          )}

          {isNeighborhoodSelected && (
            <p className="text-xs text-emerald-700">
              ✓ {form.city} - confirmed
            </p>
          )}
        </div>

        {/* NEIGHBORHOOD */}
        <div className="space-y-1">
          <div className="relative">
            <select
              name="neighborhood"
              value={form.neighborhood}
              onChange={handleChange}
              className={`${selectClass} ${
                isCitySelected ? "" : "opacity-60 cursor-not-allowed"
              } ${form.gps_consent ? "opacity-60" : ""}`}
              disabled={
                !isCitySelected ||
                loadingNeighborhoods ||
                neighborhoodByCityOptions.length === 0 ||
                form.gps_consent
              }
            >
              <option value="">
                {isCitySelected
                  ? "Select neighborhood (optional)"
                  : "Select a valid city first"}
              </option>
              {neighborhoodByCityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
                ? "Loading neighborhoods..."
                : "No neighborhoods available yet for this city."}
            </p>
          )}

          {(form.neighborhood || "").trim().length > 0 && (
            <p
              className={`text-xs ${
                locationValidation?.neighborhood_exists
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {validatingLocation
                ? "Checking neighborhood..."
                : locationValidation?.neighborhood_exists
                ? "✓ Neighborhood verified"
                : "Neighborhood not verified yet"}
            </p>
          )}

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