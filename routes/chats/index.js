const express = require("express");
const conversationsRouter = require("./conversations");
const messagesRouter = require("./messages");

const router = express.Router();

router.use(conversationsRouter);
router.use(messagesRouter);

module.exports = router;
