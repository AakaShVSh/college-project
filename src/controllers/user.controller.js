// const User = require("../models/user.model");

// const getProfile = async (req, res) => {
//     try {
//         res.json(req.user);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const updateProfile = async (req, res) => {
//     try {
//         const { name, bio, designation, avatar_url, pincode, state, country, language, timezone } = req.body;
//         const user = await User.findByIdAndUpdate(
//             req.user._id,
//             { name, bio, designation, avatar_url, pincode, state, country, language, timezone },
//             { new: true, runValidators: true }
//         ).select("-passwordHash -twoFactorSecret");
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const updateTheme = async (req, res) => {
//     try {
//         const { theme } = req.body;
//         if (!["light", "dark"].includes(theme))
//             return res.status(400).json({ message: "Theme must be light or dark" });
//         const user = await User.findByIdAndUpdate(req.user._id, { theme }, { new: true }).select("theme");
//         res.json({ theme: user.theme });
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const updateNotificationPreferences = async (req, res) => {
//     try {
//         const user = await User.findByIdAndUpdate(
//             req.user._id,
//             { notificationPreferences: req.body },
//             { new: true }
//         ).select("notificationPreferences");
//         res.json(user.notificationPreferences);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const getAllUsers = async (req, res) => {
//     try {
//         const { search, role } = req.query;
//         const filter = { companyId: req.user.companyId, isActive: true };
//         if (role) filter.role = role;
//         if (search) filter.$or = [
//             { name:        { $regex: search, $options: "i" } },
//             { designation: { $regex: search, $options: "i" } },
//             { email:       { $regex: search, $options: "i" } },
//         ];
//         const users = await User.find(filter)
//             .select("-passwordHash -twoFactorSecret -notificationPreferences")
//             .sort({ name: 1 });
//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const getUserById = async (req, res) => {
//     try {
//         const user = await User.findOne({ _id: req.params.userId, companyId: req.user.companyId })
//             .select("-passwordHash -twoFactorSecret -notificationPreferences");
//         if (!user) return res.status(404).json({ message: "User not found" });
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// const getOnlineUsers = async (req, res) => {
//     try {
//         const users = await User.find({
//             companyId:         req.user.companyId,
//             isActive:          true,
//             "presence.status": "online",
//         }).select("name avatar_url designation role presence");
//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ message: "Server error", error: error.message });
//     }
// };

// module.exports = {
//     getProfile, updateProfile, updateTheme,
//     updateNotificationPreferences, getAllUsers, getUserById, getOnlineUsers,
// };

const User    = require("../models/user.model");
const bcrypt  = require("bcryptjs");
const Channel = require("../models/channel.model");

// ── GET /api/users  (all users in the same company) ──────────────────────────
const getCompanyUsers = async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId, isActive: true })
      .select("_id name email role designation avatar_url presence")
      .lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── GET /api/users/:userId ────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.userId, companyId: req.user.companyId, isActive: true })
      .select("-passwordHash -twoFactorSecret")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── PATCH /api/users/me  (update own profile) ─────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const allowed = ["name", "bio", "designation", "avatar_url", "pincode", "state", "country", "theme", "language", "timezone"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-passwordHash -twoFactorSecret");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── PATCH /api/users/me/presence ──────────────────────────────────────────────
const updatePresence = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["online", "offline", "away"];
    if (!allowed.includes(status))
      return res.status(400).json({ message: "status must be one of: online, offline, away" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { "presence.status": status, "presence.lastSeenAt": new Date() },
      { new: true }
    ).select("presence");
    res.json(user.presence);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── PATCH /api/users/me/notifications ─────────────────────────────────────────
const updateNotificationPreferences = async (req, res) => {
  try {
    const prefs = req.body;
    const allowedKeys = [
      "mentions", "taskAssignments", "ticketUpdates", "messages", "leaveUpdates", "directMessages",
      "emailMentions", "emailTaskAssignments", "emailTicketUpdates", "emailLeaveUpdates",
    ];
    const updates = {};
    allowedKeys.forEach((k) => {
      if (prefs[k] !== undefined) updates[`notificationPreferences.${k}`] = prefs[k];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("notificationPreferences");
    res.json(user.notificationPreferences);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── POST /api/users/invite  (admin only — creates a new user) ─────────────────
const inviteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "superior")
      return res.status(403).json({ message: "Only admins or superiors can invite users" });

    const { name, email, role = "employee", designation, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email and password are required" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    const user = await User.create({
      companyId:    req.user.companyId,
      name:         name.trim(),
      email:        email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role,
      designation:  designation || "",
    });

    res.status(201).json({
      id: user._id, name: user.name, email: user.email,
      role: user.role, designation: user.designation,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ── DELETE /api/users/:userId  (admin only — deactivate) ─────────────────────
const deactivateUser = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Only admins can deactivate users" });

    await User.findOneAndUpdate(
      { _id: req.params.userId, companyId: req.user.companyId },
      { isActive: false }
    );
    res.json({ message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getCompanyUsers,
  getUserById,
  updateProfile,
  updatePresence,
  updateNotificationPreferences,
  inviteUser,
  deactivateUser,
};