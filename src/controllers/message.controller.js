const Message = require("../models/message.model");

// ── GET /api/messages  (query: channelId | subgroupId | dmId | groupDmId) ────
const getMessages = async (req, res) => {
  try {
    const { channelId, subgroupId, dmId, groupDmId, before, limit = 50 } = req.query;

    const filter = { isDeleted: false };
    if (channelId)  filter.channelId  = channelId;
    if (subgroupId) filter.subgroupId = subgroupId;
    if (dmId)       filter.dmId       = dmId;
    if (groupDmId)  filter.groupDmId  = groupDmId;
    if (before)     filter.createdAt  = { $lt: new Date(before) };

    if (!channelId && !subgroupId && !dmId && !groupDmId)
      return res.status(400).json({ message: "Provide at least one of: channelId, subgroupId, dmId, groupDmId" });

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("senderId", "name avatar_url")
      .lean();

    // Return oldest-first for the UI
    res.json(messages.reverse());
  } catch (err) {
    console.error("getMessages:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/messages ────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { channelId, subgroupId, dmId, groupDmId, content, type = "text", attachments = [], parentMessageId, mentionedUsers = [], mentionedAll = false } = req.body;

    if (!content && attachments.length === 0)
      return res.status(400).json({ message: "Message content or attachment is required" });

    const message = await Message.create({
      companyId: req.user.companyId,
      senderId:  req.user._id,
      channelId:  channelId  || null,
      subgroupId: subgroupId || null,
      dmId:       dmId       || null,
      groupDmId:  groupDmId  || null,
      content,
      type,
      attachments,
      parentMessageId: parentMessageId || null,
      mentionedUsers,
      mentionedAll,
    });

    const populated = await message.populate("senderId", "name avatar_url");
    res.status(201).json(populated);
  } catch (err) {
    console.error("sendMessage:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── PATCH /api/messages/:messageId ───────────────────────────────────────────
const editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Content is required" });

    const message = await Message.findOne({ _id: req.params.messageId, senderId: req.user._id, isDeleted: false });
    if (!message) return res.status(404).json({ message: "Message not found or not yours" });

    message.content  = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── DELETE /api/messages/:messageId ──────────────────────────────────────────
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id:      req.params.messageId,
      senderId: req.user._id,
      isDeleted: false,
    });
    if (!message) return res.status(404).json({ message: "Message not found or not yours" });

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/messages/:messageId/react ──────────────────────────────────────
const reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "Emoji is required" });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existing = message.reactions.find((r) => r.emoji === emoji);
    if (existing) {
      const idx = existing.userIds.findIndex((id) => id.toString() === req.user._id.toString());
      if (idx > -1) existing.userIds.splice(idx, 1); // toggle off
      else           existing.userIds.push(req.user._id); // toggle on
    } else {
      message.reactions.push({ emoji, userIds: [req.user._id] });
    }

    // Remove empty reaction groups
    message.reactions = message.reactions.filter((r) => r.userIds.length > 0);
    await message.save();

    res.json(message.reactions);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/messages/:messageId/read ───────────────────────────────────────
const markRead = async (req, res) => {
  try {
    await Message.updateOne(
      { _id: req.params.messageId, "readBy.userId": { $ne: req.user._id } },
      { $push: { readBy: { userId: req.user._id, readAt: new Date() } } }
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── GET /api/messages/search ──────────────────────────────────────────────────
const searchMessages = async (req, res) => {
  try {
    const { q, channelId } = req.query;
    if (!q) return res.status(400).json({ message: "Search query is required" });

    const filter = {
      companyId: req.user.companyId,
      isDeleted: false,
      $text: { $search: q },
    };
    if (channelId) filter.channelId = channelId;

    const results = await Message.find(filter)
      .sort({ score: { $meta: "textScore" } })
      .limit(30)
      .populate("senderId", "name avatar_url")
      .lean();

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { getMessages, sendMessage, editMessage, deleteMessage, reactToMessage, markRead, searchMessages };