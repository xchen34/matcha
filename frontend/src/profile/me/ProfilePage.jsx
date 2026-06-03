import { useState } from "react";
import { User } from "lucide-react";
import { MIN_BIRTH_DATE_ISO } from "@/utils/date.js";
import { cardClass, inputClass, selectClass, textareaClass } from "@/styles/UIClasses.jsx";

import {
  useLocation,
  usePhoto,
  useTags,
  useEmailChange,
  useProfileFormState,
  useProfileData,
  useProfileLocationValidation,
  useProfileSubmit,
} from "./hooks";

import {
  ProfileBasics,
  EmailChangeForm,
  GenderSelector,
  PhotoManager,
  LocationSection,
  TagsSelector,
  BiographyInput,
  ProfileActions,
  ProfileLoading,
} from "./components";

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
  } = useEmailChange({ currentUser, setMessage });
  
  const { handlePhotoUpload, setPrimaryPhoto, removePhoto, movePhoto, photoMessage } = usePhoto({
    form,
    setForm,
  });

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

  const { loadingGeo, useCurrentLocation } = useLocation(userId, setForm, setMessage);
  
  const { tagOptions, loadProfile } = useProfileData({
    userId,
    currentUser,
    onProfileUpdate,
    setForm,
    setMessage,
    setIsCityConfirmed,
    setLoading,
  });
  

  const { selectedTag, setSelectedTag, addTag, removeTag } = useTags({
    form,
    setForm,
    setMessage,
    tagOptions,
  });

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

  /* ========== Determine if profile can be saved ========== */
  const gpsConsentNeedsCoords = form.gps_consent && (!form.latitude || !form.longitude);
  const canSaveProfile =
    !loading && !validatingLocation && isLocationAccepted && hasRequiredFields && !gpsConsentNeedsCoords;
  const canAttemptSaveProfile = !loading && !validatingLocation;

  /* ========== Handle change submit ========== */
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

  if (loading) {
    return (
      <section className={cardClass}>
        <ProfileLoading />
      </section>
    );
  }

  return (
    <section className={cardClass}>
      {/* ========== Header with user info ========== */}
      <div className="space-y-1">
        <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-neutral-dark">
          <User size={20} aria-hidden="true" />
          <span>Your details</span>
        </h2>
      </div>

      {/* ========== Display current username and email ========== */}
      {currentUser && (
        <p className="text-sm text-slate-500">
          @{currentUser.username} · {currentUser.email}
        </p>
      )}

      {/* ========== Main profile form ========== */}
      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/* ========= BASIC INFO (USERNAME, EMAIL, BIRTHDATE) ========== */}
        <ProfileBasics
          form={form}
          handleChange={handleChange}
          inputClass={inputClass}
          MIN_BIRTH_DATE_ISO={MIN_BIRTH_DATE_ISO}
          maxAdultBirthDateIso={maxAdultBirthDateIso}
        />

        {/* ========= EMAIL CHANGE FORM ========== */}
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

        {/* ========= GENDER SELECTOR ========== */}
        <GenderSelector form={form} handleChange={handleChange} selectClass={selectClass} />

        {/* ========= BIOGRAPHY INPUT ========== */}
        <BiographyInput
          form={form}
          handleChange={handleChange}
          textareaClass={textareaClass}
          MAX_BIO_LENGTH={MAX_BIO_LENGTH}
        />

        {/* ========= PHOTO MANAGER ========== */}
        <PhotoManager
          photos={form.photos}
          handlePhotoUpload={handlePhotoUpload}
          setPrimaryPhoto={setPrimaryPhoto}
          removePhoto={removePhoto}
          movePhoto={movePhoto}
          photoMessage={photoMessage}
        />

        {/* ========= LOCATION SECTION ========== */}
        <LocationSection
          form={form}
          handleChange={handleChange}
          hasCityInput={hasCityInput}
          isCitySelected={isCitySelected}
          isCitySuggestionsOpen={isCitySuggestionsOpen}
          isNeighborhoodSelected={isNeighborhoodSelected}
          validatingLocation={validatingLocation}
          loadingNeighborhoods={loadingNeighborhoods}
          locationValidation={locationValidation}
          cityAutocompleteOptions={cityAutocompleteOptions}
          neighborhoodByCityOptions={neighborhoodByCityOptions}
          handleCityInputChange={(event) => handleCityInputChange(event, handleChange)}
          applyCitySuggestion={applyCitySuggestion}
          handleEditLocation={handleEditLocation}
          setIsCitySuggestionsOpen={setIsCitySuggestionsOpen}
          useCurrentLocation={useCurrentLocation}
          loadingGeo={loadingGeo}
        />

        {/* ========= TAGS SELECTOR ========== */}
        <TagsSelector
          tagOptions={tagOptions}
          selectedTag={selectedTag}
          setSelectedTag={setSelectedTag}
          addTag={addTag}
          removeTag={removeTag}
          tags={form.tags}
        />

        {/* ========= ACTIONS (SAVE BUTTON, ETC) ========== */}
        <ProfileActions
          canAttemptSaveProfile={canAttemptSaveProfile}
          canSaveProfile={canSaveProfile}
          missingRequiredFields={missingRequiredFields}
          onReload={() => loadProfile({ force: true })}
        />
      </form>

      {/* ========== MESSAGE ========== */}
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </section>
  );
}
