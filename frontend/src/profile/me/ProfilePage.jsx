import { useState } from "react";
import { User } from "lucide-react";
import { MIN_BIRTH_DATE_ISO } from "@/utils/date.js";
import { cardClass, inputClass, selectClass, textareaClass } from "@/styles/UIClasses.jsx";

import useLocation from "./hooks/useLocation";
import usePhoto from "./hooks/usePhoto";
import useTags from "./hooks/useTags";
import useEmailChange from "./hooks/useEmailChange";
import useProfileFormState from "./hooks/useProfileFormState";
import useProfileData from "./hooks/useProfileData";
import useProfileLocationValidation from "./hooks/useProfileLocationValidation";
import useProfileSubmit from "./hooks/useProfileSubmit";

import ProfileBasics from "./components/ProfileBasics.jsx";
import EmailChangeForm from "./components/EmailChangeForm.jsx";
import GenderSelector from "./components/GenderSelector.jsx";
import PhotoManager from "./components/PhotoManager.jsx";
import LocationSection from "./components/LocationSection.jsx";
import TagsSelector from "./components/TagsSelector.jsx";
import BiographyInput from "./components/BiographyInput.jsx";
import ProfileActions from "./components/ProfileActions.jsx";

const MAX_BIO_LENGTH = 500;

export default function ProfilePage({ currentUser, onProfileUpdate }) {
  const [message, setMessage] = useState("");
  const userId = currentUser?.id ?? null;

  const {
    form,
    setForm,
    loading,
    setLoading,
    hasGender,
    hasRequiredFields,
    missingRequiredFields,
    maxAdultBirthDateIso,
  } = useProfileFormState();

  const {
    locationValidation,
    validatingLocation,
    hasCityInput,
    isLocationAccepted,
    isCitySelected,
    isCitySuggestionsOpen,
    setIsCitySuggestionsOpen,
    isNeighborhoodSelected,
    setIsNeighborhoodSelected,
    setIsCityConfirmed,
    cityAutocompleteOptions,
    neighborhoodByCityOptions,
    loadingNeighborhoods,
    handleCityInputChange,
    applyCitySuggestion,
    handleEditLocation,
    setLocationValidation,
    setLocationSuggestions,
    setCitySearchSuggestions,
    setCityNeighborhoodOptions,
  } = useProfileLocationValidation({
    userId,
    form,
    setForm,
    setMessage,
  });

  const { tagOptions, loadProfile } = useProfileData({
    userId,
    currentUser,
    onProfileUpdate,
    setForm,
    setMessage,
    setIsCityConfirmed,
    setLoading,
  });

  const { loadingGeo, useCurrentLocation } = useLocation(userId, setForm, setMessage);

  const { handlePhotoUpload, setPrimaryPhoto, removePhoto } = usePhoto({
    form,
    setForm,
    setMessage,
  });

  const { selectedTag, setSelectedTag, addTag, removeTag } = useTags({
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
    emailChangeError,
  } = useEmailChange({ userId, setMessage });

  const { handleSubmit } = useProfileSubmit({
    userId,
    form,
    setForm,
    currentUser,
    onProfileUpdate,
    hasRequiredFields,
    missingRequiredFields,
    hasGender,
    isLocationAccepted,
    maxAdultBirthDateIso,
    setMessage,
  });

  const gpsConsentNeedsCoords = form.gps_consent && (!form.latitude || !form.longitude);
  const canSaveProfile =
    !loading && !validatingLocation && isLocationAccepted && hasRequiredFields && !gpsConsentNeedsCoords;
  const canAttemptSaveProfile = !loading && !validatingLocation;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    if (name === "city") {
      setForm((prev) => ({ ...prev, city: value, neighborhood: "" }));
      setIsCityConfirmed(false);
      setCityNeighborhoodOptions([]);
      setIsNeighborhoodSelected(false);
    } else if (name === "neighborhood") {
      setForm((prev) => ({ ...prev, neighborhood: value }));
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

  return (
    <section className={cardClass}>
      <div className="space-y-1">
        <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-neutral-dark">
          <User size={20} aria-hidden="true" />
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
            emailChangePreviewUrl={emailChangePreviewUrl}
            emailChangeDevVerifyUrl={emailChangeDevVerifyUrl}
            emailChangeError={emailChangeError}
          />

          <GenderSelector form={form} handleChange={handleChange} selectClass={selectClass} />

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
            handleCityInputChange={(event) => handleCityInputChange(event, handleChange)}
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

          <ProfileActions
            canAttemptSaveProfile={canAttemptSaveProfile}
            canSaveProfile={canSaveProfile}
            missingRequiredFields={missingRequiredFields}
            onReload={() => loadProfile({ force: true })}
          />
        </form>
      )}

      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}
