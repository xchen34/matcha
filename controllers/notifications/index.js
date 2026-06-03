/**
 * Barrel export for notification-related controllers.
 *
 * Keeping the public API here makes route wiring simpler while each endpoint
 * stays split into a small, focused file.
 */
const { getNotifications } = require("./getNotifications");
const { readAllNotifications } = require("./readAllNotifications");
const { readNotification } = require("./readNotification");

module.exports = {
  getNotifications,
  readAllNotifications,
  readNotification,
};
