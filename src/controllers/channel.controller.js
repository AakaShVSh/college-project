const Channel  = require("../models/channel.model");
const Subgroup = require("../models/subgroup.model");
const Message  = require("../models/message.model");
const User     = require("../models/user.model");

// ── GET /api/channels  (all channels the user belongs to) ─────────────────────
const getChannels = async (req, res) => {
  try {
    const userId    = req.user._id;
    const companyId = req.user.companyId;

    const channels = await Channel.find({
      companyId,
      isArchived: false,
      "members.userId": userId,
    }).select("_id name description icon_url members createdAt").lean();

    // Attach unread count per channel (messages after user's last read)
    const enriched = await Promise.all(
      channels.map(async (ch) => {
        const unread = await Message.countDocuments({
          channelId: ch._id,
          isDeleted: false,
          senderId:  { $ne: userId },
          "readBy.userId": { $ne: userId },
        });
        return { ...ch, unread };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error("getChannels:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── GET /api/channels/:channelId ──────────────────────────────────────────────
const getChannel = async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id:       req.params.channelId,
      companyId: req.user.companyId,
    }).lean();

    if (!channel) return res.status(404).json({ message: "Channel not found" });
    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/channels ────────────────────────────────────────────────────────
const createChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: "Channel name is required" });

    const exists = await Channel.findOne({ companyId: req.user.companyId, name: name.trim() });
    if (exists) return res.status(400).json({ message: "Channel with this name already exists" });

    const channel = await Channel.create({
      companyId:   req.user.companyId,
      name:        name.trim(),
      description: description || "",
      createdBy:   req.user._id,
      members:     [{ userId: req.user._id, canPost: true }],
    });

    // Auto-create default subgroups
    await Subgroup.insertMany([
      { channelId: channel._id, companyId: req.user.companyId, name: "General", type: "general", createdBy: req.user._id, members: [{ userId: req.user._id, canPost: true }] },
      { channelId: channel._id, companyId: req.user.companyId, name: "Help",    type: "help",    createdBy: req.user._id, members: [{ userId: req.user._id, canPost: true }] },
      { channelId: channel._id, companyId: req.user.companyId, name: "Ticket",  type: "ticket",  createdBy: req.user._id, members: [{ userId: req.user._id, canPost: true }] },
    ]);

    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── PATCH /api/channels/:channelId ───────────────────────────────────────────
const updateChannel = async (req, res) => {
  try {
    const { name, description } = req.body;
    const channel = await Channel.findOneAndUpdate(
      { _id: req.params.channelId, companyId: req.user.companyId },
      { ...(name && { name: name.trim() }), ...(description !== undefined && { description }) },
      { new: true }
    );
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    res.json(channel);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── DELETE /api/channels/:channelId (archive) ─────────────────────────────────
const archiveChannel = async (req, res) => {
  try {
    const channel = await Channel.findOneAndUpdate(
      { _id: req.params.channelId, companyId: req.user.companyId },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    if (!channel) return res.status(404).json({ message: "Channel not found" });
    res.json({ message: "Channel archived" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/channels/:channelId/members ────────────────────────────────────
const addMember = async (req, res) => {
  try {
    const { userId, canPost = true } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const channel = await Channel.findOne({ _id: req.params.channelId, companyId: req.user.companyId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const already = channel.members.some((m) => m.userId.toString() === userId);
    if (already) return res.status(400).json({ message: "User is already a member" });

    channel.members.push({ userId, canPost });
    await channel.save();

    // Also add to all subgroups of this channel
    await Subgroup.updateMany(
      { channelId: channel._id },
      { $addToSet: { members: { userId, canPost } } }
    );

    res.json({ message: "Member added" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── DELETE /api/channels/:channelId/members/:userId ──────────────────────────
const removeMember = async (req, res) => {
  try {
    const channel = await Channel.findOne({ _id: req.params.channelId, companyId: req.user.companyId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    channel.members = channel.members.filter((m) => m.userId.toString() !== req.params.userId);
    await channel.save();
    res.json({ message: "Member removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── GET /api/channels/:channelId/members ─────────────────────────────────────
const getMembers = async (req, res) => {
  try {
    const channel = await Channel.findOne({
      _id: req.params.channelId,
      companyId: req.user.companyId,
    }).populate("members.userId", "name email avatar_url role designation presence").lean();

    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const members = channel.members.map((m) => ({
      canPost:  m.canPost,
      joinedAt: m.joinedAt,
      ...m.userId,
    }));

    res.json(members);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── GET /api/channels/:channelId/subgroups ───────────────────────────────────
const getSubgroups = async (req, res) => {
  try {
    const subgroups = await Subgroup.find({
      channelId:  req.params.channelId,
      companyId:  req.user.companyId,
      isArchived: false,
    }).select("_id name description type createdAt").lean();

    res.json(subgroups);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getChannels,
  getChannel,
  createChannel,
  updateChannel,
  archiveChannel,
  addMember,
  removeMember,
  getMembers,
  getSubgroups,
};