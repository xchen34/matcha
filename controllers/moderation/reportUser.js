const moderationService = require("../../services/moderationService");
const { parsePositiveInt, MAX_FAKE_REPORT_REASON_LENGTH } = require("./helpers");

async function reportUser(req, res, next) {
  try {
    const reporterUserId = parsePositiveInt(req.userId);
    const reportedUserId = parsePositiveInt(req.params.id);

    if (!reporterUserId || !reportedUserId) {
      return res.status(400).json({ error: "authenticated user and user id param are required" });
    }

    if (reporterUserId === reportedUserId) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 5) {
      return res.status(400).json({ error: "Please provide a reason (minimum 5 characters)" });
    }
    
    if (reason.length > MAX_FAKE_REPORT_REASON_LENGTH) {
      return res.status(400).json({ error: `Reason is too long (maximum ${MAX_FAKE_REPORT_REASON_LENGTH} characters)` });
    }

    const exists = await moderationService.usersExist([reporterUserId, reportedUserId]);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const report = await moderationService.reportFake(reporterUserId, reportedUserId, reason);

    return res.status(200).json({
      message: "The user has been reported successfully. Under review.",
      report,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { reportUser };
