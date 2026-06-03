import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MIN_BIRTH_DATE_ISO, isValidBirthDateIso } from "@/utils/date.js";
import { buildApiHeaders } from "@/utils/utils.js";
import { writeStoredUser } from "@/utils/userStorage.js";

export default function useProfileSubmit({
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
}) {
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      /* ========= Validate form fields before submission ========== */
      if (!hasRequiredFields) {
        return setMessage(
          `Error: required fields missing (${missingRequiredFields.join(", ")}).`,
        );
      }

      if (!hasGender) {
        return setMessage("Error: please select your gender.");
      }

      if (!isLocationAccepted) {
        return setMessage(
          "Error: location is not verified. Please choose a valid city/neighborhood.",
        );
      }

      if (
        !isValidBirthDateIso(
          form.birth_date,
          MIN_BIRTH_DATE_ISO,
          maxAdultBirthDateIso,
        )
      ) {
        return setMessage(
          `Error: birth date must be a valid date between ${MIN_BIRTH_DATE_ISO} and ${maxAdultBirthDateIso}.`,
        );
      }

      setMessage("Submitting...");

      /* ========== Build headers and payload for profile update API request ========== */
      const headers = buildApiHeaders(
        { id: userId },
        { "Content-Type": "application/json" },
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

      /* ========== Only include photos in payload if they are valid base64 data URLs ========== */
      const photosAreBase64DataUrls =
        Array.isArray(form.photos) &&
        form.photos.every((photo) => {
          const dataUrl = String(photo?.data_url || "").trim();

          return /^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl);
        });

      if (photosAreBase64DataUrls) {
        payload.photos = form.photos;
      }

      /* ========== Call profile update API and handle response ========== */
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

        // Update form state 
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
            data.profile.latitude !== null &&
            data.profile.latitude !== undefined
              ? String(data.profile.latitude)
              : "",
          longitude:
            data.profile.longitude !== null &&
            data.profile.longitude !== undefined
              ? String(data.profile.longitude)
              : "",
          tags: Array.isArray(data.profile.tags)
            ? data.profile.tags
            : prev.tags,
          photos: Array.isArray(data.profile.photos)
            ? data.profile.photos
            : prev.photos,
        }));

        // Update stored user data
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

        // Redirect to match page if profile is completed
        if (data?.user?.profile_completed) {
          setTimeout(() => {
            navigate("/find-match");
          }, 400);
        }
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      }
    },
    [
      currentUser,
      form,
      hasGender,
      hasRequiredFields,
      isLocationAccepted,
      maxAdultBirthDateIso,
      missingRequiredFields,
      navigate,
      onProfileUpdate,
      setForm,
      setMessage,
      userId,
    ],
  );

  return { handleSubmit };
}
