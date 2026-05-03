const likeService = require("../../services/likeService");
const { createNotification } = require("../../services/notificationService");

async function viewProfile(req, res, next) {
  try {
    const rawViewerUserId = req.header("x-user-id");
    const rawViewedUserId = req.params.id;
    const viewerId = Number(rawViewerUserId);
    const viewedId = Number(rawViewedUserId);

    if (!rawViewerUserId || !rawViewedUserId) {
      return res.status(400).json({ error: "viewer_user_id (header) and viewed_user_id (param) required" });
    }
    if (!Number.isInteger(viewerId) || viewerId <= 0 || !Number.isInteger(viewedId) || viewedId <= 0) {
      return res.status(400).json({ error: "IDs must be positive integers" });
    }
    if (viewerId === viewedId) {
      return res.status(400).json({ error: "Cannot view yourself" });
    }

    const existingUsers = await likeService.checkUsersExist([viewerId, viewedId]);
    if (!existingUsers.has(viewerId)) {
      return res.status(401).json({ error: "Viewer user not found" });
    }
    if (!existingUsers.has(viewedId)) {
      return res.status(404).json({ error: "Viewed user not found" });
    }

    const inserted = await likeService.insertProfileView(viewerId, viewedId);
    if (inserted) {
      await createNotification({
        userId: viewedId,
        actorUserId: viewerId,
        type: "profile_view",
        message: "Your profile was viewed.",
        metadata: { viewer_user_id: viewerId },
      });
    }

    return res.status(201).json({ message: "View recorded" });
  } catch (error) {
    return next(error);
  }
}

module.exports = { viewProfile };
