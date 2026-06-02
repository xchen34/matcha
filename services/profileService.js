const pool = require("../db");

class ProfileService {
  /*  ========== Helpers  ========== */
  async getUserById(userId) {
    const result = await pool.query(
      `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );

    return result.rows[0];
  }

  /*  ========== My Profile  ========== */
  async getMyProfile(userId) {
    const [profileResult, tagsResult, photosResult] = await Promise.all([
      pool.query(
        `
        SELECT
          u.id AS user_id, u.email, u.username, u.first_name, u.last_name, u.email_verified, u.created_at,
          p.gender, p.sexual_preference, p.biography, p.birth_date, p.city, p.neighborhood, 
          p.gps_consent, p.latitude, p.longitude,
          GREATEST(
              LEAST(
                FLOOR(COALESCE((SELECT COUNT(*) 
                  FROM profile_views 
                  WHERE viewed_user_id = u.id), 0)::numeric / 20) +
                FLOOR(COALESCE((SELECT COUNT(*) 
                  FROM likes 
                  WHERE liked_user_id = u.id), 0)::numeric / 5) +
                CASE WHEN COALESCE((SELECT COUNT(*) 
                  FROM likes 
                  WHERE liked_user_id = u.id 
                    AND created_at > NOW() - INTERVAL '7 days'), 0) = 0 
                    THEN -1 ELSE 0 END,
                100
              ),
              0
            )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
          AND u.deleted_at IS NULL
        LIMIT 1
        `,
        [userId],
      ),
      pool.query(
        `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
        [userId],
      ),
      pool.query(
        `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
        [userId],
      ),
    ]);

    return {
      profileRow: profileResult.rows[0] || null,
      tagsRows: tagsResult.rows,
      photosRows: photosResult.rows,
    };
  }

  /*  ========== Public Profile  ========== */
  async getPublicProfile(requestedId, currentUserId) {
    const promises = [
      pool.query(
        `
        SELECT
          u.id AS user_id, u.username, u.first_name, u.last_name, u.last_seen_at,
          p.gender, p.sexual_preference, p.biography, p.birth_date, p.city, p.neighborhood,
          GREATEST(
              LEAST(
                FLOOR(COALESCE((SELECT COUNT(*) FROM profile_views WHERE viewed_user_id = u.id), 0)::numeric / 20) +
                FLOOR(COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id), 0)::numeric / 5) +
                CASE WHEN COALESCE((SELECT COUNT(*) FROM likes WHERE liked_user_id = u.id AND created_at > NOW() - INTERVAL '7 days'), 0) = 0 THEN -1 ELSE 0 END,
                100
              ),
              0
            )::int AS fame_rating
        FROM users AS u
        LEFT JOIN profiles AS p ON p.user_id = u.id
        WHERE u.id = $1
          AND u.deleted_at IS NULL
        LIMIT 1
        `,
        [requestedId],
      ),
      pool.query(
        `
        SELECT t.name
        FROM user_profile_tags upt
        JOIN tags t ON t.id = upt.tag_id
        WHERE upt.user_id = $1
        ORDER BY t.name ASC
        `,
        [requestedId],
      ),
      pool.query(
        `
        SELECT id, data_url, is_primary
        FROM user_photos
        WHERE user_id = $1
        ORDER BY is_primary DESC, id ASC
        `,
        [requestedId],
      ),
    ];

    if (currentUserId) {
      promises.push(
        pool.query(
          `
          SELECT
            EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $1 AND liked_user_id = $2) AS i_liked,
            EXISTS(SELECT 1 FROM likes WHERE liker_user_id = $2 AND liked_user_id = $1) AS liked_me,
            EXISTS(SELECT 1 FROM fake_account_reports WHERE reporter_user_id = $1 AND reported_user_id = $2) AS reported_fake_by_me,
            EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $1 AND blocked_user_id = $2) AS blocked_by_you,
            EXISTS(SELECT 1 FROM user_blocks WHERE blocker_user_id = $2 AND blocked_user_id = $1) AS blocked_you
          `,
          [currentUserId, requestedId],
        ),
      );
    } else {
      promises.push(
        Promise.resolve({
          rows: [
            {
              i_liked: false,
              liked_me: false,
              reported_fake_by_me: false,
              blocked_by_you: false,
              blocked_you: false,
            },
          ],
        }),
      );
    }

    const [profileResult, tagsResult, photosResult, relationResult] =
      await Promise.all(promises);

    return {
      profileRow: profileResult.rows[0] || null,
      tagsRows: tagsResult.rows,
      photosRows: photosResult.rows,
      relationRow: relationResult.rows[0],
    };
  }

  async getProfileTagsUsage(limit) {
    const result = await pool.query(
      `
      SELECT t.name, COUNT(upt.user_id)::int AS usage_count
      FROM tags t
      LEFT JOIN user_profile_tags upt ON upt.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC, t.name ASC
      LIMIT $1
      `,
      [limit],
    );
    return result.rows;
  }

  /*  ========== Update Profile  ========== */
  async updateProfile(userId, data, tagsArray, photosArray) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (data.first_name || data.last_name || data.username) {
        await client.query(
          `
          UPDATE users
          SET
            first_name = COALESCE($1, first_name),
            last_name = COALESCE($2, last_name),
            username = COALESCE($3, username)
          WHERE id = $4
          `,
          [data.first_name, data.last_name, data.username, userId],
        );
      }

      const updatedProfile = await client.query(
        `
        INSERT INTO profiles (
          user_id, gender, sexual_preference, biography, birth_date, city, neighborhood,
          gps_consent, latitude, longitude, fame_rating
        )
        VALUES (
          $1, $2, $3, $4, COALESCE($5, (SELECT birth_date FROM profiles WHERE user_id = $1), (CURRENT_DATE - INTERVAL '18 years')::date),
          $6, $7, $8, $9, $10, COALESCE((SELECT fame_rating FROM profiles WHERE user_id = $1), 0)
        )
        ON CONFLICT (user_id) DO UPDATE SET
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
          user_id, biography, gender, sexual_preference, city, neighborhood, 
          gps_consent, birth_date, latitude, longitude, fame_rating
        `,
        [
          userId,
          data.gender,
          data.sexual_preference,
          data.biography,
          data.birth_date,
          data.city,
          data.neighborhood,
          data.gps_consent,
          data.latitude,
          data.longitude,
        ],
      );

      if (tagsArray !== null) {
        await client.query(
          `
          DELETE FROM user_profile_tags 
          WHERE user_id = $1
          `,
          [userId],
        );
        if (tagsArray.length > 0) {
          const insertTagsQuery = tagsArray
            .map((_, i) => `($${i + 1})`)
            .join(", ");
          await client.query(
            `
            INSERT INTO tags (name) 
            VALUES ${insertTagsQuery} ON CONFLICT (name) DO NOTHING
            `,
            tagsArray,
          );
          const tagIdsResult = await client.query(
            `
            SELECT id 
            FROM tags 
            WHERE name = ANY($1::text[])
            `,
            [tagsArray],
          );
          const tagIds = tagIdsResult.rows.map((row) => row.id);
          if (tagIds.length > 0) {
            const userProfileTagsQuery = tagIds
              .map((_, i) => `($1, $${i + 2})`)
              .join(", ");
            await client.query(
              `
              INSERT INTO user_profile_tags (user_id, tag_id) 
              VALUES ${userProfileTagsQuery} ON CONFLICT DO NOTHING
              `,
              [userId, ...tagIds],
            );
          }
        }
      }

      let photosResultData = [];
      if (photosArray !== null) {
        await client.query("DELETE FROM user_photos WHERE user_id = $1", [
          userId,
        ]);
        for (let i = 0; i < photosArray.length; i++) {
          const photo = photosArray[i];
          const result = await client.query(
            `
            INSERT INTO user_photos (user_id, data_url, is_primary) 
            VALUES ($1, $2, $3) 
            RETURNING id, data_url, is_primary
            `,
            [userId, photo.data_url, photo.is_primary],
          );
          photosResultData.push(result.rows[0]);
        }
      } else {
        const result = await client.query(
          `
          SELECT id, data_url, is_primary 
          FROM user_photos 
          WHERE user_id = $1 
          ORDER BY is_primary 
          DESC, id ASC
          `,
          [userId],
        );
        photosResultData = result.rows;
      }

      const userResult = await client.query(
        `
        SELECT email, username, first_name, last_name, email_verified, created_at 
        FROM users WHERE id = $1
        `,
        [userId],
      );

      const tagsResult = await client.query(
        `
        SELECT t.name 
        FROM user_profile_tags upt 
        JOIN tags t ON t.id = upt.tag_id 
        WHERE upt.user_id = $1 
        ORDER BY t.name ASC
        `,
        [userId],
      );

      await client.query("COMMIT");

      return {
        profileRow: updatedProfile.rows[0],
        userRow: userResult.rows[0],
        photosRow: photosResultData,
        tagsRow: tagsResult.rows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ProfileService();
