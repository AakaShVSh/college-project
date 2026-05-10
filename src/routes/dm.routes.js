const express = require("express");
const router  = express.Router();
const { authenticate: protect } = require("../middlewares/protect");
const {
  listDMs, getOrCreateDM,
  listGroupDMs, createGroupDM,
  getDMMessages, sendDMMessage,
} = require("../controllers/dm.controller");

router.use(protect);

// One-on-one DMs
router.get("/",            listDMs);
router.post("/",           getOrCreateDM);

// Group DMs
router.get("/groups",      listGroupDMs);
router.post("/groups",     createGroupDM);

// Messages (works for both DM and Group DM — controller detects which)
router.get("/:dmId/messages",  getDMMessages);
router.post("/:dmId/messages", sendDMMessage);

module.exports = router;