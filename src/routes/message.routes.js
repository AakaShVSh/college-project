const express = require("express");
const router  = express.Router();
const { authenticate: protect } = require("../middlewares/protect");

const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  markRead,
  searchMessages,
} = require("../controllers/message.controller");

router.use(protect);

// ── Static routes FIRST (before any :param routes) ───────────────────────
router.get("/",        getMessages);    // ?channelId= or ?subgroupId=
router.post("/",       sendMessage);
router.get("/search",  searchMessages); // ?q=&channelId=  ← MUST be before /:messageId

// ── Param routes AFTER ────────────────────────────────────────────────────
router.patch("/:messageId",        editMessage);
router.delete("/:messageId",       deleteMessage);
router.post("/:messageId/react",   reactToMessage);
router.post("/:messageId/read",    markRead);

module.exports = router;