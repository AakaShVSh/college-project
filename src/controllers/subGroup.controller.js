const Subgroup = require("../models/subgroup.model");
const Channel  = require("../models/channel.model");

// ── GET /api/subgroups/:subgroupId ────────────────────────────────────────────
const getSubgroup = async (req, res) => {
  try {
    const sg = await Subgroup.findOne({ _id: req.params.subgroupId, companyId: req.user.companyId }).lean();
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });
    res.json(sg);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── POST /api/subgroups ───────────────────────────────────────────────────────
const createSubgroup = async (req, res) => {
  try {
    const { channelId, name, description, type = "custom" } = req.body;
    if (!channelId || !name)
      return res.status(400).json({ message: "channelId and name are required" });

    if (req.user.role === "employee")
      return res.status(403).json({ message: "Only admins or superiors can create subgroups" });

    const channel = await Channel.findOne({ _id: channelId, companyId: req.user.companyId });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const exists = await Subgroup.findOne({ channelId, name: name.trim() });
    if (exists) return res.status(400).json({ message: "A subgroup with that name already exists" });

    const sg = await Subgroup.create({
      channelId, companyId: req.user.companyId,
      name: name.trim(), description: description || "",
      type, createdBy: req.user._id,
      members: [{ userId: req.user._id, canPost: true }],
    });
    res.status(201).json(sg);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── PATCH /api/subgroups/:subgroupId ─────────────────────────────────────────
const updateSubgroup = async (req, res) => {
  try {
    if (req.user.role === "employee")
      return res.status(403).json({ message: "Insufficient permissions" });

    const { name, description } = req.body;
    const sg = await Subgroup.findOneAndUpdate(
      { _id: req.params.subgroupId, companyId: req.user.companyId },
      { ...(name && { name: name.trim() }), ...(description !== undefined && { description }) },
      { new: true }
    );
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });
    res.json(sg);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── DELETE /api/subgroups/:subgroupId (archive) ──────────────────────────────
const archiveSubgroup = async (req, res) => {
  try {
    if (req.user.role === "employee")
      return res.status(403).json({ message: "Insufficient permissions" });

    const sg = await Subgroup.findOneAndUpdate(
      { _id: req.params.subgroupId, companyId: req.user.companyId },
      { isArchived: true, archivedAt: new Date() },
      { new: true }
    );
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });
    res.json({ message: "Subgroup archived" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── GET /api/subgroups/:subgroupId/members ───────────────────────────────────
const getMembers = async (req, res) => {
  try {
    const sg = await Subgroup.findOne({ _id: req.params.subgroupId, companyId: req.user.companyId })
      .populate("members.userId", "name email avatar_url role designation presence")
      .lean();
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });
    const members = sg.members.map((m) => ({ canPost: m.canPost, joinedAt: m.joinedAt, ...m.userId }));
    res.json(members);
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── POST /api/subgroups/:subgroupId/members ──────────────────────────────────
const addMember = async (req, res) => {
  try {
    if (req.user.role === "employee")
      return res.status(403).json({ message: "Insufficient permissions" });

    const { userId, canPost = true } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const sg = await Subgroup.findOne({ _id: req.params.subgroupId, companyId: req.user.companyId });
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });

    if (sg.members.some((m) => m.userId.toString() === userId))
      return res.status(400).json({ message: "User is already a member" });

    sg.members.push({ userId, canPost });
    await sg.save();
    res.json({ message: "Member added" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

// ── DELETE /api/subgroups/:subgroupId/members/:userId ────────────────────────
const removeMember = async (req, res) => {
  try {
    if (req.user.role === "employee")
      return res.status(403).json({ message: "Insufficient permissions" });

    const sg = await Subgroup.findOne({ _id: req.params.subgroupId, companyId: req.user.companyId });
    if (!sg) return res.status(404).json({ message: "Subgroup not found" });

    sg.members = sg.members.filter((m) => m.userId.toString() !== req.params.userId);
    await sg.save();
    res.json({ message: "Member removed" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err.message }); }
};

module.exports = { getSubgroup, createSubgroup, updateSubgroup, archiveSubgroup, getMembers, addMember, removeMember };