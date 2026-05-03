const pool = require("../../db");
const { getIO, REALTIME_EVENTS } = require("../../realtime");
const {
  resolveCurrentUserId,
  isNonEmptyString,
  USERNAME_PATTERN,
  MIN_BIRTH_DATE_ISO,
  allowedGenders,
  allowedPreferences,
  normalizeTagsInput,
  parseBirthDate,
  isAtLeast18YearsOld,
  getAge,
  isProfileCompleted,
} = require("../../routes/profileHelpers");
const { forwardGeocode } = require("./shared");
const {
  validatePhotoMimeType,
  normalizePhotosInput,
} = require("../../utils/photoValidator");

const MAX_BIO_LENGTH = 500;

async function updateMyProfile(req, res, next) {
  const client = await pool.connect();
  let inTransaction = false;

  try {
    const currentUserId = await resolveCurrentUserId(req);
    if (!currentUserId) {
      return res.status(401).json({
        error: "Not authenticated. Please login and provide x-user-id.",
      });
    }

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

    if (biography !== undefined && biography !== null && typeof biography !== "string") {
      return res.status(400).json({ error: "biography must be a string" });
    }

    const safeBiography = typeof biography === "string" ? biography.trim() : "";
    if (safeBiography.length > MAX_BIO_LENGTH) {
      return res.status(400).json({ error: `biography must be at most ${MAX_BIO_LENGTH} characters` });
    }

    const safeGender = isNonEmptyString(gender) ? gender.trim() : null;
    if (!safeGender) {
      return res.status(400).json({ error: "gender is required" });
    }
    if (!allowedGenders.includes(safeGender)) {
      return res.status(400).json({ error: "gender must be valid", allowed_values: allowedGenders });
    }

    let safeSexualPreference = sexual_preference;
    if (!safeSexualPreference || !allowedPreferences.includes(safeSexualPreference)) {
      safeSexualPreference = "both";
    }

    const gpsConsent = Boolean(gps_consent);
    let safeCity = isNonEmptyString(city) ? city.trim() : "";
    let safeNeighborhood = isNonEmptyString(neighborhood) ? neighborhood.trim() : "";

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const hasLatitude = Number.isFinite(parsedLatitude);
    const hasLongitude = Number.isFinite(parsedLongitude);

    if (gpsConsent) {
      if (!hasLatitude || !hasLongitude) {
        return res.status(400).json({
          error: "latitude and longitude are required when gps_consent is enabled",
        });
      }

      const locationSuggestions = await forwardGeocode({
        city: safeCity,
        neighborhood: safeNeighborhood,
        limit: 5,
      });

      if (locationSuggestions.length === 0) {
        return res.status(400).json({ error: "Unable to validate the provided city" });
      }

      if (!safeCity) {
        const fallbackCity = locationSuggestions[0].city;
        if (fallbackCity) {
          safeCity = fallbackCity;
        }
      }
    } else if (!safeCity) {
      return res.status(400).json({ error: "city is required when gps_consent is disabled" });
    }

    let normalizedTags = null;
    if (tags !== undefined) {
      normalizedTags = normalizeTagsInput(tags);
      if (normalizedTags === null) {
        return res.status(400).json({ error: "tags must be an array of strings" });
      }
      if (normalizedTags.length > 10) {
        return res.status(400).json({ error: "A maximum of 10 tags is allowed" });
      }
    }

    let normalizedPhotos = null;
    if (photos !== undefined) {
      const photoResult = await normalizePhotosInput(photos);
      if (photoResult && photoResult.error) {
        return res.status(400).json({ error: photoResult.error });
      }
      normalizedPhotos = photoResult ? photoResult.photos : null;
    }

    const normalizedFirstName = isNonEmptyString(first_name) ? first_name.trim() : null;
    const normalizedLastName = isNonEmptyString(last_name) ? last_name.trim() : null;
    const normalizedUsername = isNonEmptyString(username) ? username.trim() : null;
    let normalizedBirthDate = isNonEmptyString(birth_date) ? birth_date.trim() : null;

    if (normalizedUsername && !USERNAME_PATTERN.test(normalizedUsername)) {
      return res.status(400).json({
        error: "username is invalid (use 2-20 characters: letters, numbers, dot, underscore, hyphen)",
      });
    }

    if (normalizedBirthDate) {
      const parsedBirthDate = parseBirthDate(normalizedBirthDate);
      if (!parsedBirthDate) {
        return res.status(400).json({ error: "birth_date must be a valid date (YYYY-MM-DD)" });
      }

      if (normalizedBirthDate < MIN_BIRTH_DATE_ISO) {
        return res.status(400).json({ error: `birth_date must be on or after ${MIN_BIRTH_DATE_ISO}` });
      }

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsedBirthDate > today) {
        return res.status(400).json({ error: "birth_date cannot be in the future" });
      }

      if (!isAtLeast18YearsOld(parsedBirthDate)) {
        return res.status(400).json({ error: "You must be at least 18 years old" });
      }

      normalizedBirthDate = parsedBirthDate.toISOString().slice(0, 10);
    }

    await client.query("BEGIN");
    inTransaction = true;

    if (normalizedFirstName || normalizedLastName || normalizedUsername) {
      await client.query(
        `
        UPDATE users
        SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          username = COALESCE($3, username)
        WHERE id = $4
        `,
        [normalizedFirstName, normalizedLastName, normalizedUsername, currentUserId],
      );
    }

    const updated = await client.query(
      `
      INSERT INTO profiles (
        user_id,
        gender,
        sexual_preference,
        biography,
        birth_date,
        city,
        neighborhood,
        gps_consent,
        latitude,
        longitude,
        fame_rating
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        COALESCE($5, (SELECT birth_date FROM profiles WHERE user_id = $1), (CURRENT_DATE - INTERVAL '18 years')::date),
        $6,
        $7,
        $8,
        $9,
        $10,
        COALESCE((SELECT fame_rating FROM profiles WHERE user_id = $1), 0)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        biography = EXCLUDED.biography,
        gender = COALESCE(EXCLUDED.gender, profiles.gender),
        sexual_preference = COALESCE(EXCLUDED.sexual_preference, profiles.sexual_preference),
        city = EXCLUDED.city,
        neighborhood = EXCLUDED.neighborhood,
        gps_consent = EXCLUDED.gps_consent,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date)
      RETURNING
        user_id,
        biography,
        gender,
        sexual_preference,
        city,
        neighborhood,
        gps_consent,
        birth_date,
        latitude,
        longitude,
        fame_rating
      `,
      [
        currentUserId,
        safeGender,
        safeSexualPreference,
        safeBiography,
        normalizedBirthDate,
        safeCity,
        safeNeighborhood,
        gpsConsent,
        hasLatitude ? parsedLatitude : null,
        hasLongitude ? parsedLongitude : null,
      ],
    );

    if (normalizedTags !== null) {
      await client.query("DELETE FROM user_profile_tags WHERE user_id = $1", [currentUserId]);
      for (const tag of normalizedTags) {
        const tagResult = await client.query(
          `
          INSERT INTO tags (name)
          VALUES ($1)
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
          `,
          [tag],
        );

        await client.query(
          `
          INSERT INTO user_profile_tags (user_id, tag_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          `,
          [currentUserId, tagResult.rows[0].id],
        );
      }
    }

    const tagsResult = await client.query(
      `
      SELECT t.name
      FROM user_profile_tags upt
      JOIN tags t ON t.id = upt.tag_id
      WHERE upt.user_id = $1
      ORDER BY t.name ASC
      `,
      [currentUserId],
    );

    if (normalizedPhotos !== null) {
      await client.query("DELETE FROM user_photos WHERE user_id = $1", [currentUserId]);
      for (const photo of normalizedPhotos) {
        await client.query(
          `
          INSERT INTO user_photos (user_id, data_url, is_primary)
          VALUES ($1, $2, $3)
          `,
          [currentUserId, photo.data_url, photo.is_primary],
        );
      }
    }

    const updatedUserResult = await client.query(
      `
      SELECT id, email, username, first_name, last_name, email_verified, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [currentUserId],
    );

    await client.query("COMMIT");
    inTransaction = false;

    const profile = updated.rows[0];
    const updatedUser = updatedUserResult.rows[0];
    const photosResult = await client.query(
      `
      SELECT id, data_url, is_primary
      FROM user_photos
      WHERE user_id = $1
      ORDER BY is_primary DESC, id ASC
      `,
      [currentUserId],
    );

    const io = getIO();
    if (io && updatedUser) {
      const primaryPhoto = photosResult.rows.find((item) => item.is_primary);
      io.emit(REALTIME_EVENTS.PROFILE_UPDATED, {
        user_id: Number(updatedUser.id),
        profile: {
          username: updatedUser.username,
          gender: profile.gender || "",
          sexual_preference: profile.sexual_preference || "",
          city: profile.city || "",
          neighborhood: profile.neighborhood || "",
          age: getAge(profile.birth_date),
          fame_rating: profile.fame_rating ?? 0,
          tags: tagsResult.rows.map((entry) => entry.name),
          primary_photo_url: primaryPhoto ? primaryPhoto.data_url : null,
        },
      });
    }

    const profilePayload = {
      gender: profile.gender,
      sexual_preference: profile.sexual_preference,
      biography: profile.biography,
      birth_date: profile.birth_date,
      city: profile.city,
      neighborhood: profile.neighborhood,
      gps_consent: Boolean(profile.gps_consent),
      latitude: profile.latitude,
      longitude: profile.longitude,
      tags: tagsResult.rows.map((entry) => entry.name),
      fame_rating: profile.fame_rating,
      photos: photosResult.rows.map((item) => ({
        id: item.id,
        data_url: item.data_url,
        is_primary: item.is_primary,
      })),
    };

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            username: updatedUser.username,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            email_verified: updatedUser.email_verified,
            profile_completed: isProfileCompleted(
              {
                username: updatedUser.username,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                email: updatedUser.email,
              },
              profilePayload,
            ),
            created_at: updatedUser.created_at,
          }
        : undefined,
      profile: profilePayload,
    });
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }

    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        return res.status(409).json({ error: "Email already exists" });
      }
      if (error.constraint === "users_username_key") {
        return res.status(409).json({ error: "Username already exists" });
      }
      return res.status(409).json({ error: "Email or username already exists" });
    }

    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { updateMyProfile };