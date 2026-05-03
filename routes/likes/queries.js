const express = require("express");
const likesController = require("../../controllers/likes");

const router = express.Router();

router.get("/profile/likes", likesController.getLikes);
router.get("/profile/views", likesController.getViews);
router.get("/profile/matches", likesController.getMatches);
router.get("/matches", likesController.getSuggestions);

module.exports = router;
