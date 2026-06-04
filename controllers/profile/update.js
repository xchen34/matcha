const profileService = require("../../services/profileService");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const {
  MAX_BIO_LENGTH,
  resolveCurrentUserId,
  isNonEmptyString,
  USERNAME_PATTERN,
  allowedGenders,
  allowedPreferences,
  normalizeTagsInput,
  parseBirthDate,
  isAtLeast18YearsOld,
  getMinBirthDateIso,
  getAge,
  isProfileCompleted,
} = require("./helpers");
const { forwardGeocode } = require("./shared");
const {
  validatePhotoMimeType,
  normalizePhotosInput,
} = require("../../utils/photoValidator");

async function updateMyProfile(req, res, next) {
  try {
    /* ========= Authentication ========== */
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login again.",
      });
    }

    /* ========= Extract request body ========== */
    const {
      username,
      first_name,
      last_name,
      email,
      biography,
      gender,
      sexual_preference,
      city,
      neighborhood,
      birth_date,
      gps_consent,
      latitude,
      longitude,
      tags,
      photos,
    } = req.body;

    /* ========= Validate biography ========== */
    if (
      biography !== undefined &&
      biography !== null &&
      typeof biography !== "string"
    ) {
      return res.status(400).json({
        error: "biography must be a string",
      });
    }

    const safeBiography = typeof biography === "string" ? biography.trim() : "";
    if (safeBiography.length > MAX_BIO_LENGTH) {
      return res.status(400).json({
        error: `biography must be at most ${MAX_BIO_LENGTH} characters`,
      });
    }

    /* ========= Validate gender ========== */
    const safeGender = isNonEmptyString(gender) ? gender.trim() : null;
    if (!safeGender) {
      return res.status(400).json({
        error: "gender is required",
      });
    }
    if (!allowedGenders.includes(safeGender)) {
      return res.status(400).json({
        error: "gender must be valid",
        allowed_values: allowedGenders,
      });
    }

    /* ========= Validate sexual preference ========== */
    let safeSexualPreference = sexual_preference;
    if (
      !safeSexualPreference ||
      !allowedPreferences.includes(safeSexualPreference)
    ) {
      safeSexualPreference = "both";
    }

    /* ========= Validate location ========== */
    const gpsConsent = Boolean(gps_consent);
    let safeCity = isNonEmptyString(city) ? city.trim() : "";
    let safeNeighborhood = isNonEmptyString(neighborhood)
      ? neighborhood.trim()
      : "";

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const hasLatitude = Number.isFinite(parsedLatitude);
    const hasLongitude = Number.isFinite(parsedLongitude);

    if (gpsConsent) {
      if (!hasLatitude || !hasLongitude) {
        return res.status(400).json({
          error:
            "latitude and longitude are required when gps_consent is enabled",
        });
      }

      const locationSuggestions = await forwardGeocode({
        city: safeCity,
        neighborhood: safeNeighborhood,
        limit: 5,
      });

      if (locationSuggestions.length === 0) {
        return res.status(400).json({
          error: "Unable to validate the provided city",
        });
      }

      if (!safeCity) {
        const fallbackCity = locationSuggestions[0].city;
        if (fallbackCity) {
          safeCity = fallbackCity;
        }
      }
    } else if (!safeCity) {
      return res.status(400).json({
        error: "city is required when gps_consent is disabled",
      });
    }

    /* ========= Validate tags ========== */
    let normalizedTags = null;
    if (tags !== undefined) {
      normalizedTags = normalizeTagsInput(tags);
      if (normalizedTags === null) {
        return res.status(400).json({
          error: "tags must be an array of strings",
        });
      }
      if (normalizedTags.length > 10) {
        return res.status(400).json({
          error: "A maximum of 10 tags is allowed",
        });
      }
    }

    /* ========= Validate photos ========== */
    let normalizedPhotos = null;
    if (photos !== undefined) {
      const photoResult = await normalizePhotosInput(photos);
      if (photoResult && photoResult.error) {
        return res.status(400).json({
          error: photoResult.error,
        });
      }
      normalizedPhotos = photoResult ? photoResult.photos : null;
    }

    /* ========= Validate name field ========== */
    const normalizedFirstName = isNonEmptyString(first_name)
      ? first_name.trim()
      : null;
    const normalizedLastName = isNonEmptyString(last_name)
      ? last_name.trim()
      : null;
    const normalizedUsername = isNonEmptyString(username)
      ? username.trim()
      : null;

    if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        error:
          "username is invalid (use 2-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    /* ========= Validate birth date ========== */
    let normalizedBirthDate = isNonEmptyString(birth_date)
      ? birth_date.trim()
      : null;

    if (normalizedBirthDate) {
      const parsedBirthDate = parseBirthDate(normalizedBirthDate);
      if (!parsedBirthDate) {
        return res.status(400).json({
          error: "birth_date must be a valid date (YYYY-MM-DD)",
        });
      }

      const minBirthDateIso = getMinBirthDateIso();
      if (normalizedBirthDate < minBirthDateIso) {
        return res.status(400).json({
          error: `birth_date must be on or after ${minBirthDateIso}`,
        });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsedBirthDate > today) {
        return res.status(400).json({
          error: "birth_date cannot be in the future",
        });
      }

      if (!isAtLeast18YearsOld(parsedBirthDate)) {
        return res.status(400).json({
          error: "You must be at least 18 years old",
        });
      }

      normalizedBirthDate = parsedBirthDate.toISOString().slice(0, 10);
    }

    /* ========= Update profile in database ========== */
    const result = await profileService.updateProfile(
      currentUserId,
      {
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        username: normalizedUsername,
        gender: safeGender,
        sexual_preference: safeSexualPreference,
        biography: safeBiography,
        birth_date: normalizedBirthDate,
        city: safeCity,
        neighborhood: safeNeighborhood,
        gps_consent: gpsConsent,
        latitude: hasLatitude ? parsedLatitude : null,
        longitude: hasLongitude ? parsedLongitude : null,
      },
      normalizedTags,
      normalizedPhotos,
    );

    /* ========= Extract results ========== */
    const updatedProfile = result.profileRow;
    const userResult = result.userRow;
    const photosResultData = result.photosRow;
    const tagsResultRows = result.tagsRow;

    /* ========= Build response payload ========== */
    const profilePayload = {
      gender: updatedProfile.gender || "",
      sexual_preference: updatedProfile.sexual_preference || "",
      biography: updatedProfile.biography || "",
      birth_date: updatedProfile.birth_date,
      age: getAge(updatedProfile.birth_date),
      city: updatedProfile.city || "",
      neighborhood: updatedProfile.neighborhood || "",
      gps_consent: Boolean(updatedProfile.gps_consent),
      latitude: updatedProfile.latitude,
      longitude: updatedProfile.longitude,
      fame_rating: updatedProfile.fame_rating ?? 0,
      tags: tagsResultRows ? tagsResultRows.map((row) => row.name) : tags || [],
      photos: photosResultData.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };

    /* ========= Check profile completion ========== */
    const isCompletedNow = isProfileCompleted(userResult, profilePayload);
    
    /* ========= Emit real-time update via Socket.IO ========== */
    const io = getIO();
    if (io) {
      const socketPayload = {
        user_id: currentUserId,
        updates: { ...profilePayload },
        profile_completed: isCompletedNow,
      };
      if (userResult.username)
        socketPayload.updates.username = userResult.username;
      if (userResult.first_name)
        socketPayload.updates.first_name = userResult.first_name;
      if (userResult.last_name)
        socketPayload.updates.last_name = userResult.last_name;

      io.emit(REALTIME_EVENTS.USER_PROFILE_UPDATED, socketPayload);
    }

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedProfile.user_id,
        email: userResult.email,
        username: userResult.username,
        first_name: userResult.first_name,
        last_name: userResult.last_name,
        email_verified: userResult.email_verified,
        profile_completed: isCompletedNow,
        created_at: userResult.created_at,
      },
      profile: profilePayload,
    });
  } catch (error) {
    /* Handle duplicate username error */
    if (error.code === "23505" && error.constraint === "users_username_key") {
      return res.status(409).json({
        error: "Username already exists",
      });
    }
    return next(error);
  }
}

module.exports = { updateMyProfile };
