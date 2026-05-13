const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const Company  = require("../models/company.model");
const User     = require("../models/user.model");
const Channel  = require("../models/channel.model");
const Subgroup = require("../models/subgroup.model");
const { Session, PasswordReset } = require("../models/auth.model");
require("dotenv").config();

// ── Helpers ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "gi7gug9ug9o88iohoyyyyyyy89yuyuuyuuuuuy8676rrr6rr";

const generateToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// httpOnly cookie — JS on the client can never read this
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production", // HTTPS only in prod
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // "none" required for cross-site in prod
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:     "/",
};

/**
 * Sets the token as an httpOnly cookie and returns user/company data.
 * The raw token is intentionally NOT included in the JSON body.
 */
const sendTokenResponse = (res, token, statusCode = 200, data = {}) => {
  res
    .status(statusCode)
    .cookie("token", token, COOKIE_OPTIONS)
    .json(data); // ← no token field in body
};

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const {
      companyName, address, companyEmail, password,
      userName, pincode, state, country, channelName,
    } = req.body;

    if (!companyName || !companyEmail || !password || !userName || !channelName)
      return res.status(400).json({ message: "companyName, companyEmail, password, userName, channelName are required" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const exists = await Company.findOne({ email: companyEmail.toLowerCase() });
    if (exists)
      return res.status(400).json({ message: "Company email already registered" });

    const company = await Company.create({
      name:         companyName.trim(),
      address:      address || "",
      email:        companyEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
    });

    const user = await User.create({
      companyId:    company._id,
      name:         userName.trim(),
      email:        companyEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role:         "admin",
      pincode:      pincode || "",
      state:        state   || "",
      country:      country || "",
    });

    const channel = await Channel.create({
      companyId: company._id,
      name:      channelName.trim(),
      createdBy: user._id,
      members:   [{ userId: user._id, canPost: true }],
    });

    await Subgroup.insertMany([
      { channelId: channel._id, companyId: company._id, name: "General", type: "general", createdBy: user._id, members: [{ userId: user._id, canPost: true }] },
      { channelId: channel._id, companyId: company._id, name: "Help",    type: "help",    createdBy: user._id, members: [{ userId: user._id, canPost: true }] },
      { channelId: channel._id, companyId: company._id, name: "Ticket",  type: "ticket",  createdBy: user._id, members: [{ userId: user._id, canPost: true }] },
    ]);

    const token = generateToken(user._id);

    await Session.create({
      userId:     user._id,
      tokenHash:  hashToken(token),
      expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers["user-agent"] || null,
      ipAddress:  req.ip,
    });

    sendTokenResponse(res, token, 201, {
      user: {
        id:        user._id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        companyId: company._id,
        avatar_url: user.avatar_url,
        theme:     user.theme,
      },
      company: { id: company._id, name: company.name },
    });
  } catch (error) {
    console.error("register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive)
      return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(401).json({ message: "Invalid credentials" });

    // 2FA pending — don't issue a full session yet
    if (user.twoFactorEnabled)
      return res.status(200).json({ requiresTwoFactor: true, userId: user._id });

    const token = generateToken(user._id);

    await Session.create({
      userId:     user._id,
      tokenHash:  hashToken(token),
      expiresAt:  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      deviceInfo: req.headers["user-agent"] || null,
      ipAddress:  req.ip,
    });

    user.presence.status     = "online";
    user.presence.lastSeenAt = new Date();
    await user.save();

    sendTokenResponse(res, token, 200, {
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role,
        companyId:   user.companyId,
        avatar_url:  user.avatar_url,
        designation: user.designation,
        theme:       user.theme,
        language:    user.language,
        timezone:    user.timezone,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (token) await Session.deleteOne({ tokenHash: hashToken(token) });

    req.user.presence.status     = "offline";
    req.user.presence.lastSeenAt = new Date();
    await req.user.save();

    // Clear the cookie by setting maxAge to 0
    res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/logout-all ─────────────────────────────────────────────────
const logoutAll = async (req, res) => {
  try {
    await Session.deleteMany({ userId: req.user._id });

    req.user.presence.status     = "offline";
    req.user.presence.lastSeenAt = new Date();
    await req.user.save();

    res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return the same message to avoid user enumeration
    if (!user) return res.json({ message: "If that email exists, a reset link has been sent" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    await PasswordReset.create({
      userId:    user._id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    console.log(`[DEV] Reset token for ${user.email}: ${rawToken}`);

    res.json({
      message:  "If that email exists, a reset link has been sent",
      // Remove devToken in production
      devToken: process.env.NODE_ENV !== "production" ? rawToken : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: "Token and newPassword are required" });

    const record = await PasswordReset.findOne({
      tokenHash: hashToken(token),
      usedAt:    null,
      expiresAt: { $gt: new Date() },
    });
    if (!record)
      return res.status(400).json({ message: "Invalid or expired reset token" });

    await User.findByIdAndUpdate(record.userId, {
      passwordHash: await bcrypt.hash(newPassword, 10),
    });

    record.usedAt = new Date();
    await record.save();

    // Invalidate all existing sessions for security
    await Session.deleteMany({ userId: record.userId });

    res.json({ message: "Password reset successfully. Please log in again." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── POST /api/auth/change-password ───────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both currentPassword and newPassword are required" });

    const user  = await User.findById(req.user._id);
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match)
      return res.status(400).json({ message: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Revoke all OTHER sessions; keep the current one alive
    const currentToken = req.cookies?.token;
    await Session.deleteMany({
      userId:    user._id,
      tokenHash: { $ne: hashToken(currentToken) },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── GET /api/auth/sessions ────────────────────────────────────────────────────
const getSessions = async (req, res) => {
  try {
    const sessions = await Session
      .find({ userId: req.user._id })
      .select("-tokenHash")
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── DELETE /api/auth/sessions/:sessionId ─────────────────────────────────────
const revokeSession = async (req, res) => {
  try {
    await Session.findOneAndDelete({ _id: req.params.sessionId, userId: req.user._id });
    res.json({ message: "Session revoked" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── 2FA stubs ─────────────────────────────────────────────────────────────────
const enable2FA  = async (_req, res) => res.json({ message: "Integrate otplib — generate secret + QR URI" });
const verify2FA  = async (_req, res) => res.json({ message: "Integrate otplib — verify OTP + return token" });
const disable2FA = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: false, twoFactorSecret: null });
    res.json({ message: "2FA disabled" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  register, login, logout, logoutAll,
  forgotPassword, resetPassword, changePassword,
  getMe, getSessions, revokeSession,
  enable2FA, verify2FA, disable2FA,
};