const pool = require("../../db");

async function getProfileTags(req, res, next) {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 100))
      : 100;
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

    return res.json({
      tags: result.rows.map((row) => ({
        name: row.name,
        usage_count: row.usage_count,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProfileTags };