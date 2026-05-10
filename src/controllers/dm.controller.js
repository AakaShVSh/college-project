const { DirectMessage, GroupDM } = require("../models/dm.model");
const Message  = require("../models/message.model");
const User     = require("../models/user.model");

// ────────────────────────────── One-on-One DMs ───────────────────────────────

// GET /api/dm  — list all DM threads for the current user
const listDMs = async (req, res) => {
  try {
    const dms = await DirectMessage.find({
      companyId:    req.user.companyId,
      participants: req.user._id,
    })
      .populate("participants", "name email avatar_url designation role presence")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Attach "otherUser" for convenience
    const enriched = dms.map((dm) => ({
      ...dm,
      otherUser: dm.participants.find((p) => p._id.toString() !== req.user._id.toString()),
    }));

    res.json(enriched);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// POST /api/dm  — get-or-create a DM thread with another user
const getOrCreateDM = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const selfId  = req.user._id.toString();
    const otherId = userId.toString();
    if (selfId === otherId) return res.status(400).json({ message: "Cannot DM yourself" });

    // Try to find existing DM (both participant orders)
    let dm = await DirectMessage.findOne({
      companyId: req.user.companyId,
      participants: { $all: [selfId, otherId], $size: 2 },
    }).populate("participants", "name email avatar_url designation role presence");

    if (!dm) {
      dm = await DirectMessage.create({
        companyId:    req.user.companyId,
        participants: [selfId, otherId],
      });
      dm = await DirectMessage.findById(dm._id)
        .populate("participants", "name email avatar_url designation role presence");
    }

    const result = {
      ...dm.toObject(),
      otherUser: dm.participants.find((p) => p._id.toString() !== selfId),
    };
    res.json(result);
  } catch (err) {
    // Duplicate key → find and return existing
    if (err.code === 11000) {
      const selfId  = req.user._id.toString();
      const otherId = req.body.userId?.toString();
      const dm = await DirectMessage.findOne({
        companyId: req.user.companyId,
        participants: { $all: [selfId, otherId] },
      }).populate("participants", "name email avatar_url designation role presence");
      if (dm) {
        const result = { ...dm.toObject(), otherUser: dm.participants.find((p) => p._id.toString() !== selfId) };
        return res.json(result);
      }
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ──────────────────────────────── Group DMs ──────────────────────────────────

// GET /api/dm/groups
const listGroupDMs = async (req, res) => {
  try {
    const groups = await GroupDM.find({
      companyId:    req.user.companyId,
      participants: req.user._id,
    })
      .populate("participants", "name avatar_url presence")
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json(groups);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// POST /api/dm/groups
const createGroupDM = async (req, res) => {
  try {
    const { participantIds, name = "" } = req.body;
    if (!participantIds || participantIds.length < 2)
      return res.status(400).json({ message: "Provide at least 2 participantIds" });

    const allIds = [...new Set([req.user._id.toString(), ...participantIds.map(String)])];

    const group = await GroupDM.create({
      companyId:    req.user.companyId,
      name,
      createdBy:    req.user._id,
      participants: allIds,
    });

    const populated = await GroupDM.findById(group._id)
      .populate("participants", "name avatar_url presence");
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ──────────────────────────── DM Messages ────────────────────────────────────

// GET /api/dm/:dmId/messages?limit=50&before=<ISO>
const getDMMessages = async (req, res) => {
  try {
    const { dmId }     = req.params;
    const { limit = 50, before, type: dmType } = req.query;

    // Determine if this is a regular DM or group DM
    let isDM    = false;
    let isGroup = false;

    const dm    = await DirectMessage.findOne({ _id: dmId, participants: req.user._id });
    const group = await GroupDM.findOne({ _id: dmId, participants: req.user._id });

    if (dm)    isDM    = true;
    if (group) isGroup = true;
    if (!isDM && !isGroup) return res.status(404).json({ message: "DM not found or not a participant" });

    const filter = {
      isDeleted: false,
      ...(isDM    ? { dmId:      dmId } : {}),
      ...(isGroup ? { groupDmId: dmId } : {}),
      ...(before  ? { createdAt: { $lt: new Date(before) } } : {}),
    };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("senderId", "name avatar_url")
      .lean();

    res.json(messages.reverse());
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// POST /api/dm/:dmId/messages
const sendDMMessage = async (req, res) => {
  try {
    const { dmId }    = req.params;
    const { content, type = "text", attachments = [] } = req.body;
    if (!content && !attachments.length)
      return res.status(400).json({ message: "Content is required" });

    const dm    = await DirectMessage.findOne({ _id: dmId, participants: req.user._id });
    const group = await GroupDM.findOne({ _id: dmId, participants: req.user._id });

    if (!dm && !group) return res.status(404).json({ message: "DM not found" });

    const msg = await Message.create({
      companyId:  req.user.companyId,
      senderId:   req.user._id,
      ...(dm    ? { dmId }      : {}),
      ...(group ? { groupDmId: dmId } : {}),
      content, type, attachments,
    });

    // Update lastMessageAt on thread
    if (dm)    await DirectMessage.findByIdAndUpdate(dmId, { lastMessageId: msg._id, lastMessageAt: new Date() });
    if (group) await GroupDM.findByIdAndUpdate(dmId,       { lastMessageId: msg._id, lastMessageAt: new Date() });

    const populated = await msg.populate("senderId", "name avatar_url");
    res.status(201).json(populated);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

module.exports = { listDMs, getOrCreateDM, listGroupDMs, createGroupDM, getDMMessages, sendDMMessage };