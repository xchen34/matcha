const profileService = require("../../services/profileService");

// Get profile tags with usage statistics (default limit: 100)
async function getProfileTags(req, res, next) {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit)
      ? Math.max(1, Math.min(rawLimit, 100))
      : 100;
    const rows = await profileService.getProfileTagsUsage(limit);

    return res.json({
      tags: rows.map((row) => ({
        name: row.name,
        usage_count: row.usage_count,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProfileTags };
