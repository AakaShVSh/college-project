const express = require("express");
const router  = express.Router();
const { authenticate: protect } = require("../middlewares/protect");

const {
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  archiveChannel,
  addMember,
  removeMember,
  getMembers,
  getSubgroups,
} = require("../controllers/channel.controller");

router.use(protect); // all channel routes require auth

router.get("/",                                  getChannels);
router.post("/",                                 createChannel);
router.get("/:channelId",                        getChannel);
router.patch("/:channelId",                      updateChannel);
router.delete("/:channelId",                     archiveChannel);

router.get("/:channelId/members",                getMembers);
router.post("/:channelId/members",               addMember);
router.delete("/:channelId/members/:userId",     removeMember);

router.get("/:channelId/subgroups",              getSubgroups);

module.exports = router;