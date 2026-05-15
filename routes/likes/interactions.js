const express = require("express");
const likesController = require("../../controllers/likes");

const router = express.Router();

/*  ========== VIEWS  ========== */
router.post("/users/:id/view", likesController.viewProfile);

/*  ========== LIKES  ========== */
router.get("/users/:id/like", likesController.checkLike);
router.post("/users/:id/like", likesController.likeUser);
router.delete("/users/:id/like", likesController.unlikeUser);

/*  ========== MATCHES  ========== */
router.get("/users/:id/is-match", likesController.checkMatch);

module.exports = router;
