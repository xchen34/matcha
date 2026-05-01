import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, useNavigate } from "react-router-dom";
import { FaLocationArrow } from "react-icons/fa";
import { FiCalendar, FiCompass, FiImage, FiInfo, 
    FiMail, FiMapPin, FiTag, FiUser} from "react-icons/fi";
import { connectRealtime } from "../realtime/socket.js";
import { MAX_PHOTO_SIZE_BYTES, MAX_TOTAL_PHOTOS_SIZE_BYTES,
  MAX_PHOTOS_COUNT } from "../utils/photoValidator.js";
import { buildApiHeaders } from "../utils.js";
import { writeStoredUser } from "../utils/userStorage.js";
import { MIN_BIRTH_DATE_ISO, isValidBirthDateIso, getMaxAdultBirthDateIso } from "../utils/date.js";
import { bytesToKB } from "../utils/formatUtils.js";
import { normalizeLocationPrefix, getValidationCacheKey } from "../utils/locationUtils.js";
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass, textareaClass, selectClass } from "../styles/UIClasses.jsx";

import useLocation from "./hooks/useLocation";
import usePhoto from "./hooks/usePhoto";
import useTags from "./hooks/useTags";
import useEmailChange from "./hooks/useEmailChange";

import ProfileBasics from "./components/ProfileBasics.jsx";
import EmailChangeForm from "./components/EmailChangeForm.jsx";
import GenderSelector from "./components/GenderSelector.jsx";
import PhotoManager from "./components/PhotoManager.jsx";
import LocationSection from "./components/LocationSection.jsx";
import TagsSelector from "./components/TagsSelector.jsx";
import BiographyInput from "./components/BiographyInput.jsx";

const MAX_BIO_LENGTH = 500;

export default function ProfilePage({ currentUser, onProfileUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    gender: "",
    sexual_preference: "",
    biography: "",
    birth_date: "",
    city: "",
    neighborhood: "",
    gps_consent: false,
    latitude: "",
    longitude: "",
    tags: [],
    photos: [],
  });
  
  const [tagOptions, setTagOptions] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [citySearchSuggestions, setCitySearchSuggestions] = useState([]);
  const [locationValidation, setLocationValidation] = useState(null);
  const [cityNeighborhoodOptions, setCityNeighborhoodOptions] = useState([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const userId = currentUser?.id ?? null;
  const { loadingGeo, useCurrentLocation } = useLocation(
    userId,
    setForm,
    setMessage
  );
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [isNeighborhoodSelected, setIsNeighborhoodSelected] = useState(false);
  const [isCityConfirmed, setIsCityConfirmed] = useState(false);
  const validationCacheRef = useRef(new Map());
  const cityNeighborhoodCacheRef = useRef(new Map());
  const latestValidationRequestRef = useRef(0);
  const hasCityInput = (form.city || "").trim().length > 0;
  const hasNeighborhoodInput = (form.neighborhood || "").trim().length > 0;
  const { handlePhotoUpload, setPrimaryPhoto, removePhoto } = usePhoto({
    form,
    setForm,
    setMessage,
  });
  const {
    selectedTag,
    setSelectedTag,
    addTag,
    removeTag,
  } = useTags({
    form,
    setForm,
    setMessage,
    tagOptions,
  });

  const {
    emailChangeOpen,
    setEmailChangeOpen,
    emailChangeLoading,
    emailChangeForm,
    setEmailChangeForm,
    emailChangePreviewUrl,
    emailChangeDevVerifyUrl,
    handleEmailChangeInput,
    handleEmailChangeSubmit,
  } = useEmailChange({
    userId,
    setMessage,
  });

  // Required fields logic
  const hasUsername = (form.username || "").trim().length > 0;
  const hasFirstName = (form.first_name || "").trim().length > 0;
  const hasLastName = (form.last_name || "").trim().length > 0;
  const hasEmail = (form.email || "").trim().length > 0;
  const hasGender = (form.gender || "").trim().length > 0;
  const hasAge = (form.birth_date || "").trim().length > 0;
  const hasCity = (form.city || "").trim().length > 0;

  const hasRequiredFields =
    hasUsername &&
    hasFirstName &&
    hasLastName &&
    hasEmail &&
    hasGender &&
    hasAge &&
    hasCity;

  const missingRequiredFields = [
    !hasUsername ? "username" : null,
    !hasFirstName ? "first name" : null,
    !hasLastName ? "last name" : null,
    !hasEmail ? "email" : null,
    !hasGender ? "gender" : null,
    !hasAge ? "age" : null,
    !hasCity ? "city" : null,
  ].filter(Boolean);
  const isLocationAccepted =
    Boolean(locationValidation?.city_exists) || isCityConfirmed;

  const gpsConsentNeedsCoords =
    form.gps_consent && (!form.latitude || !form.longitude);

  const canSaveProfile =
    !loading &&
    !validatingLocation &&
    isLocationAccepted &&
    hasRequiredFields &&
    !gpsConsentNeedsCoords;
  const canAttemptSaveProfile = !loading && !validatingLocation;
  const isCitySelected =
    (form.city || "").trim().length > 0 &&
    (isCityConfirmed ||
      (!validatingLocation && Boolean(locationValidation?.city_exists)));
  const maxAdultBirthDateIso = useMemo(() => getMaxAdultBirthDateIso(), []);

  function buildSuggestionKey(suggestion) {
    return `${suggestion.city || ""}-${suggestion.display_name || ""}-${suggestion.latitude ?? ""}-${suggestion.longitude ?? ""}`;
  }

  const citySuggestionOptions = useMemo(() => {
    const sourceSuggestions =
      citySearchSuggestions.length > 0
        ? citySearchSuggestions
        : locationSuggestions;

    return sourceSuggestions
      .filter((item) => (item.city || "").trim().length > 0)
      .map((item) => ({
        key: buildSuggestionKey(item),
        city: item.city,
        neighborhood: item.neighborhood || "",
        label: item.display_name,
      }));
  }, [citySearchSuggestions, locationSuggestions]);

  const neighborhoodByCitySuggestions = useMemo(() => {
    const selectedCity = normalizeLocationPrefix(form.city);
    if (!selectedCity) return [];

    const byNeighborhood = new Map();
    for (const item of locationSuggestions) {
      const itemCity = normalizeLocationPrefix(item.city);
      const itemNeighborhood = (item.neighborhood || "").trim();
      if (!itemNeighborhood || itemCity !== selectedCity) continue;

      const neighborhoodKey = normalizeLocationPrefix(itemNeighborhood);
      if (!byNeighborhood.has(neighborhoodKey)) {
        byNeighborhood.set(neighborhoodKey, {
          value: itemNeighborhood,
          label: `${itemNeighborhood} - ${item.display_name}`,
        });
      }
    }

    return Array.from(byNeighborhood.values())
      .sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: "base" }))
      .slice(0, 20);
  }, [locationSuggestions, form.city]);

  const neighborhoodByCityOptions =
    cityNeighborhoodOptions.length > 0
      ? cityNeighborhoodOptions
      : neighborhoodByCitySuggestions;

  const cityAutocompleteOptions = useMemo(() => {
    const prefix = normalizeLocationPrefix(form.city);
    if (!prefix) return [];

    return citySuggestionOptions
      .filter((item) => {
        const normalizedCity = normalizeLocationPrefix(item.city);
        return (
          normalizedCity.startsWith(prefix) || normalizedCity.includes(prefix)
        );
      })
      .slice(0, 12);
  }, [citySuggestionOptions, form.city]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCitySuggestions() {
      if (!userId) {
        setCitySearchSuggestions([]);
        return;
      }

      const city = (form.city || "").trim();
      if (city.length < 2) {
        setCitySearchSuggestions([]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set("query", city);
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-suggestions?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );

        const data = await response.json();
        if (!response.ok || cancelled) {
          if (!cancelled) {
            setMessage(
              `City suggestions unavailable (${response.status}). ${data?.error || "Check backend logs."}`,
            );
          }
          return;
        }

        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions.map((item) => ({
              city: item.city,
              neighborhood: "",
              display_name: item.display_name || item.city,
            }))
          : [];

        if (!cancelled) {
          setCitySearchSuggestions(suggestions);
        }
      } catch {

        if (!cancelled) {
          setCitySearchSuggestions([]);
          setMessage("City suggestions failed. Check backend availability.");
        }
      }
    }

    const timeoutId = setTimeout(fetchCitySuggestions, 220);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [userId, form.city]);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile/me", {
        headers: buildApiHeaders({ id: userId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Failed to load profile"}`);
        setLoading(false);

        if (response.status === 401) {
          setMessage("Not authorized. Please login again if needed.");
        }

        return;
      }

      setForm({
        username: data.user?.username || currentUser?.username || "",
        first_name: data.user?.first_name || "",
        last_name: data.user?.last_name || "",
        email: data.user?.email || "",
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
        biography: data.profile.biography || "",
        birth_date: data.profile.birth_date
          ? String(data.profile.birth_date).slice(0, 10)
          : "",
        city: data.profile.city || "",
        neighborhood: data.profile.neighborhood || "",
        gps_consent: Boolean(data.profile.gps_consent),
        latitude:
          data.profile.latitude !== null && data.profile.latitude !== undefined
            ? String(data.profile.latitude)
            : "",
        longitude:
          data.profile.longitude !== null && data.profile.longitude !== undefined
            ? String(data.profile.longitude)
            : "",
        tags: Array.isArray(data.profile.tags) ? data.profile.tags : [],
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : [],
      });
      setIsCityConfirmed(Boolean((data.profile.city || "").trim()));
      if (data.user && typeof onProfileUpdate === "function") {
        const nextUser = {
          ...(currentUser || {}),
          ...data.user,
        };
        writeStoredUser(nextUser);
        onProfileUpdate(nextUser);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.username, userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTagOptions() {
      if (!userId) {
        return;
      }

      try {
        const response = await fetch("/api/profile/tags", {
          headers: buildApiHeaders({ id: userId }),
        });
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        setTagOptions(Array.isArray(data.tags) ? data.tags : []);
      } catch {
        if (!cancelled) {
          setTagOptions([]);
        }
      }
    }

    fetchTagOptions();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "city") {
      setForm((prev) => ({
        ...prev,
        city: value,
        neighborhood: "",
      }));
      setIsCityConfirmed(false);
      setCityNeighborhoodOptions([]);
      setIsNeighborhoodSelected(false);
    } else if (name === "neighborhood") {
      setForm((prev) => ({
        ...prev,
        neighborhood: value,
      }));
      setIsNeighborhoodSelected(value.trim().length > 0);
    } else {
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    }

    if (name === "city") {
      setLocationValidation(null);
      setCitySearchSuggestions([]);
    }

    if (name === "latitude" || name === "longitude" || name === "gps_consent") {
      setLocationValidation(null);
      setLocationSuggestions([]);
    }
  }

  const validateLocationInput = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!userId) {
        if (!silent) {
          setMessage("Please login first.");
        }
        return;
      }

      const city = (form.city || "").trim();
      const neighborhood = (form.neighborhood || "").trim();
      const latitude = (form.latitude || "").trim();
      const longitude = (form.longitude || "").trim();
      const cacheKey = getValidationCacheKey(
        city,
        neighborhood,
        latitude,
        longitude,
      );
      const cached = validationCacheRef.current.get(cacheKey);
      if (cached) {
        setLocationValidation(cached.validation || null);
        setLocationSuggestions(cached.suggestions || []);
        return;
      }

      if (!city && !neighborhood && (!latitude || !longitude)) {
        if (!silent) {
          setMessage("Enter city/neighborhood or coordinates before verification.");
        }
        return;
      }

      setValidatingLocation(true);
      if (!silent) {
        setMessage("Checking location...");
      }

      const requestId = latestValidationRequestRef.current + 1;
      latestValidationRequestRef.current = requestId;

      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (neighborhood) params.set("neighborhood", neighborhood);
      if (latitude) params.set("latitude", latitude);
      if (longitude) params.set("longitude", longitude);
      params.set("limit", "5");

      try {
        const response = await fetch(
          `/api/profile/validate-location?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );
        const data = await response.json();

      // Ignore stale responses from older requests (e.g. "Pari") arriving after newer ones (e.g. "Paris").
        if (requestId !== latestValidationRequestRef.current) {
          return;
        }

        if (!response.ok) {
          setLocationValidation(null);
          setLocationSuggestions([]);
          if (!silent) {
            setMessage(`Error: ${data.error || "Location verification failed"}`);
          }
          return;
        }

        setLocationValidation(data.validation || null);
        setLocationSuggestions(
          Array.isArray(data.suggestions) ? data.suggestions : [],
        );
        validationCacheRef.current.set(cacheKey, {
          validation: data.validation || null,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        });

        if (data.validation?.is_valid) {
          if (!silent) {
            setMessage("Location verified. You can save safely.");
          }
        } else {
          if (!silent) {
            setMessage(
              "Location needs confirmation. Choose a suggestion or adjust your input.",
            );
          }
        }
      } catch (error) {
        if (requestId !== latestValidationRequestRef.current) {
          return;
        }
        setLocationValidation(null);
        setLocationSuggestions([]);
        if (!silent) {
          setMessage(`Error: ${error.message}`);
        }
      } finally {
        if (requestId === latestValidationRequestRef.current) {
          setValidatingLocation(false);
        }
      }
    },
    [form.city, form.latitude, form.neighborhood, form.longitude, userId],
  );

  function applyCitySuggestion(option) {
    setForm((prev) => ({
      ...prev,
      city: option.city,
      neighborhood: "",
    }));
    setIsCityConfirmed(true);
    setLocationValidation((prev) => ({
      ...(prev || {}),
      is_valid: true,
      city_exists: true,
      neighborhood_exists: true,
      matched_exact_suggestion: true,
    }));
    setCityNeighborhoodOptions([]);
    setCitySearchSuggestions([]);
    setIsNeighborhoodSelected(false);
    setIsCitySuggestionsOpen(false);
    setMessage("City suggestion selected. Choose a neighborhood if you want to be more specific.");
  }

  function handleEditLocation() {
    setForm((prev) => ({
      ...prev,
      neighborhood: "",
      gps_consent: false,
      latitude: "",
      longitude: "",
    }));
    setIsCityConfirmed(false);
    setCityNeighborhoodOptions([]);
    setLocationValidation(null);
    setIsNeighborhoodSelected(false);
    setMessage("Edit your city if needed.");
  }

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const city = (form.city || "").trim();
    const neighborhood = (form.neighborhood || "").trim();
    const latitude = (form.latitude || "").trim();
    const longitude = (form.longitude || "").trim();

    if (!city && !neighborhood) {
      setLocationValidation(null);
      setLocationSuggestions([]);
      return undefined;
    }

    // Avoid hammering validate-location while typing city only; city confirmation comes from suggestion click.
    if (city && !neighborhood && !latitude && !longitude && isCityConfirmed) {
      return undefined;
    }

    const handle = setTimeout(() => {
      validateLocationInput({ silent: true });
    }, 900);

    return () => clearTimeout(handle);
  }, [
    userId,
    form.city,
    form.neighborhood,
    form.latitude,
    form.longitude,
    form.gps_consent,
    isCityConfirmed,
    validateLocationInput,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCityNeighborhoods() {
      if (!userId || !hasCityInput || !isCitySelected) {
        setCityNeighborhoodOptions([]);
        setLoadingNeighborhoods(false);
        return;
      }

      const cityCacheKey = normalizeLocationPrefix(form.city);
      const cachedNeighborhoods = cityNeighborhoodCacheRef.current.get(cityCacheKey);
      if (cachedNeighborhoods) {
        setCityNeighborhoodOptions(cachedNeighborhoods);
        setLoadingNeighborhoods(false);
        return;
      }

      try {
        setLoadingNeighborhoods(true);
        const params = new URLSearchParams();
        params.set("city", form.city.trim());
        params.set("limit", "20");

        const response = await fetch(
          `/api/profile/city-neighborhoods?${params.toString()}`,
          {
            headers: buildApiHeaders({ id: userId }),
          },
        );
        const data = await response.json();
        if (!response.ok || cancelled) {
          return;
        }

        const options = Array.isArray(data.neighborhoods)
          ? data.neighborhoods.map((item) => ({
              value: item.name,
              label: `${item.name} - ${item.display_name}`,
            }))
          : [];

        if (!cancelled) {
          cityNeighborhoodCacheRef.current.set(cityCacheKey, options);
          setCityNeighborhoodOptions(options);
        }
      } catch {
        if (!cancelled) {
          setCityNeighborhoodOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingNeighborhoods(false);
        }
      }
    }

    loadCityNeighborhoods();
    return () => {
      cancelled = true;
    };
  }, [userId, hasCityInput, isCitySelected, form.city]);

  function handleCityInputChange(event) {
    handleChange(event);
    if (!isNeighborhoodSelected) {
      setIsCitySuggestionsOpen(true);
    }

    const typed = normalizeLocationPrefix(event.target.value);
    if (!typed) return;

    const matched = citySuggestionOptions.find(
      (item) => normalizeLocationPrefix(item.city) === typed,
    );
    if (matched) {
      applyCitySuggestion(matched);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!hasRequiredFields) {
      setMessage(
        `Error: required fields missing (${missingRequiredFields.join(", ")}).`,
      );
      return;
    }

    if (!hasGender) {
      setMessage("Error: please select your gender.");
      return;
    }

    if (!isLocationAccepted) {
      setMessage("Error: location is not verified. Please choose a valid city/neighborhood.");
      return;
    }

    if (!isValidBirthDateIso(form.birth_date, MIN_BIRTH_DATE_ISO, maxAdultBirthDateIso)) {
      setMessage(
        `Error: birth date must be a valid date between ${MIN_BIRTH_DATE_ISO} and ${maxAdultBirthDateIso}.`,
      );
      return;
    }

    setMessage("Submitting...");

    const headers = buildApiHeaders(
      { id: userId },
      {
        "Content-Type": "application/json",
      },
    );

    const payload = {
      username: form.username,
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      gender: form.gender,
      sexual_preference: (form.sexual_preference || "both").trim(),
      biography: form.biography,
      birth_date: form.birth_date || null,
      city: form.city,
      neighborhood: form.neighborhood,
      gps_consent: form.gps_consent,
      latitude: form.latitude,
      longitude: form.longitude,
      tags: form.tags,
    };

    const photosAreBase64DataUrls =
      Array.isArray(form.photos) &&
      form.photos.every((photo) => {
        const dataUrl = String(photo?.data_url || "").trim();
        return /^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl);
      });

    // Preserve existing backend photos when current form photo URLs are not base64 data URLs.
    if (photosAreBase64DataUrls) {
      payload.photos = form.photos;
    }

    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`Error: ${data.error || "Update failed"}`);

        if (response.status === 401) {
          setMessage("Not authorized. Please login again if needed.");
        }

        return;
      }

      setForm((prev) => ({
        ...prev,
        username: data.user?.username || prev.username,
        first_name: data.user?.first_name || prev.first_name,
        last_name: data.user?.last_name || prev.last_name,
        email: data.user?.email || prev.email,
        gender: data.profile.gender || "",
        sexual_preference: data.profile.sexual_preference || "",
        biography: data.profile.biography || "",
        birth_date: data.profile.birth_date
          ? String(data.profile.birth_date).slice(0, 10)
          : "",
        city: data.profile.city || "",
        neighborhood: data.profile.neighborhood || "",
        gps_consent: Boolean(data.profile.gps_consent),
        latitude:
          data.profile.latitude !== null && data.profile.latitude !== undefined
            ? String(data.profile.latitude)
            : "",
        longitude:
          data.profile.longitude !== null && data.profile.longitude !== undefined
            ? String(data.profile.longitude)
            : "",
        tags: Array.isArray(data.profile.tags) ? data.profile.tags : prev.tags,
        photos: Array.isArray(data.profile.photos) ? data.profile.photos : prev.photos,
      }));

      if (data.user) {
        const nextUser = {
          ...(currentUser || {}),
          ...data.user,
        };
        writeStoredUser(nextUser);
        if (typeof onProfileUpdate === "function") {
          onProfileUpdate(nextUser);
        }
      }

      setMessage("Success: profile updated");
      if (data?.user?.profile_completed) {
        setTimeout(() => {
          navigate("/find-match");
        }, 400);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  }

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <FiUser size={20} aria-hidden="true" />
          <span>Your details</span>
        </h2>
      </div>

      {currentUser && (
        <p className="text-sm text-slate-500">
          @{currentUser.username} · {currentUser.email}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            <ProfileBasics
              form={form}
              handleChange={handleChange}
              inputClass={inputClass}
              MIN_BIRTH_DATE_ISO={MIN_BIRTH_DATE_ISO}
              maxAdultBirthDateIso={maxAdultBirthDateIso}
            />

          <EmailChangeForm
            email={form.email}
            emailChangeOpen={emailChangeOpen}
            setEmailChangeOpen={setEmailChangeOpen}
            emailChangeForm={emailChangeForm}
            emailChangeLoading={emailChangeLoading}
            handleEmailChangeInput={handleEmailChangeInput}
            handleEmailChangeSubmit={handleEmailChangeSubmit}
            setEmailChangeForm={setEmailChangeForm}
          />

          <GenderSelector
            form={form}
            handleChange={handleChange}
            selectClass={selectClass}
          />

          <BiographyInput
            form={form}
            handleChange={handleChange}
            textareaClass={textareaClass}
            MAX_BIO_LENGTH={MAX_BIO_LENGTH}
          />

          <PhotoManager
            photos={form.photos}
            handlePhotoUpload={handlePhotoUpload}
            setPrimaryPhoto={setPrimaryPhoto}
            removePhoto={removePhoto}
          />
          
          <LocationSection
            form={form}
            handleChange={handleChange}
            handleCityInputChange={handleCityInputChange}
            cityAutocompleteOptions={cityAutocompleteOptions}
            applyCitySuggestion={applyCitySuggestion}
            isCitySuggestionsOpen={isCitySuggestionsOpen}
            setIsCitySuggestionsOpen={setIsCitySuggestionsOpen}
            isCitySelected={isCitySelected}
            isNeighborhoodSelected={isNeighborhoodSelected}
            neighborhoodByCityOptions={neighborhoodByCityOptions}
            loadingNeighborhoods={loadingNeighborhoods}
            locationValidation={locationValidation}
            validatingLocation={validatingLocation}
            handleEditLocation={handleEditLocation}
            useCurrentLocation={useCurrentLocation}
            loadingGeo={loadingGeo}
            hasCityInput={hasCityInput}
          />

         <TagsSelector
            tagOptions={tagOptions}
            selectedTag={selectedTag}
            setSelectedTag={setSelectedTag}
            addTag={addTag}
            removeTag={removeTag}
            tags={form.tags}
          />

          <div className="flex items-center gap-3">
            <button type="submit" className={primaryButtonClass} disabled={!canAttemptSaveProfile}>
              Save Profile
            </button>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={loadProfile}
            >
              Reload Profile
            </button>
          </div>

          {!canSaveProfile && (
            <p className="text-xs text-amber-700">
              Save is locked. Required: {missingRequiredFields.join(", ") || "verified location"}.<br />
              <span className="text-xs text-slate-500">Fields marked with <span className="text-red-600">*</span> are required.</span>
            </p>
          )}
        </form>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}
      
      {(emailChangePreviewUrl || emailChangeDevVerifyUrl) && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {emailChangePreviewUrl && (
            <p>
              Ethereal preview: {' '}
              <a
                href={emailChangePreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-deep underline"
              >
                Open verification email
              </a>
            </p>
          )}
          {emailChangeDevVerifyUrl && (
            <p>
              Fallback verify link: {' '}
              <a
                href={emailChangeDevVerifyUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-brand-deep underline"
              >
                Verify directly in app
              </a>
            </p>
          )}
        </div>
      )}
    </section>
  );
}