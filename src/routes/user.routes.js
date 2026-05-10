const express = require("express");
const router  = express.Router();
const { authenticate: protect } = require("../middlewares/protect");

const {
  getCompanyUsers,
  getUserById,
  updateProfile,
  updatePresence,
  updateNotificationPreferences,
  inviteUser,
  deactivateUser,
} = require("../controllers/user.controller");

router.use(protect);

router.get("/",                          getCompanyUsers);
router.post("/invite",                   inviteUser);

router.patch("/me",                      updateProfile);
router.patch("/me/presence",             updatePresence);
router.patch("/me/notifications",        updateNotificationPreferences);

router.get("/:userId",                   getUserById);
router.delete("/:userId",                deactivateUser);

module.exports = router;