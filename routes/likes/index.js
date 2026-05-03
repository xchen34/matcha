const express = require("express");
const queriesRouter = require("./queries");
const interactionsRouter = require("./interactions");

const router = express.Router();

router.use(queriesRouter);
router.use(interactionsRouter);

module.exports = router;
