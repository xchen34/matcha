const express = require("express");
const {
  getProfileTags,
  getReverseGeocode,
  validateLocation,
  getCityNeighborhoods,
  getCitySuggestions,
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
} = require("../controllers/profile");

const router = express.Router();

/*  ========== PROFILE TAGS  ========== */
router.get("/profile/tags", getProfileTags);

/*  ========== LOCATION  ========== */
router.get("/profile/reverse-geocode", getReverseGeocode);
router.get("/profile/validate-location", validateLocation);

/*  ========== CITY DATA  ========== */
router.get("/profile/city-neighborhoods", getCityNeighborhoods);
router.get("/profile/city-suggestions", getCitySuggestions);

/*  ========== PROFILE  ========== */
router.get("/profile/me", getMyProfile);
router.put("/profile/me", updateMyProfile);
router.get("/profile/:id", getPublicProfile);

module.exports = router;

