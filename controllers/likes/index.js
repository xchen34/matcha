/**
 * Barrel export for the likes controller group.
 *
 * This file keeps the public controller surface in one place so route wiring
 * can import a single module while the actual handlers stay split by feature.
 */
const { viewProfile } = require("./viewProfile");
const { checkLike } = require("./checkLike");
const { likeUser } = require("./likeUser");
const { unlikeUser } = require("./unlikeUser");
const { checkMatch } = require("./checkMatch");
const { getLikes } = require("./getLikes");
const { getViews } = require("./getViews");
const { getMatches } = require("./getMatches");
const { getSuggestions } = require("./getSuggestions");

module.exports = {
  viewProfile,
  checkLike,
  likeUser,
  unlikeUser,
  checkMatch,
  getLikes,
  getViews,
  getMatches,
  getSuggestions,
};
