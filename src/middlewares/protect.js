const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const User   = require("../models/user.model");
const { Session } = require("../models/auth.model");

const JWT_SECRET = process.env.JWT_SECRET || "gi7gug9ug9o88iohoyyyyyyy89yuyuuyuuuuuy8676rrr6rr";

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

const authenticate = async (req, res, next) => {
  try {
    // ── Token source: httpOnly cookie ONLY ───────────────────────────────────
    // We deliberately do NOT read the Authorization header here.
    // The token never leaves the cookie jar — JS on the client cannot access it.
    const raw = req.cookies?.token ?? null;

    if (!raw)
      return res.status(401).json({ message: "Not authenticated" });

    // ── Verify JWT signature + expiry ─────────────────────────────────────────
    let payload;
    try {
      payload = jwt.verify(raw, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Block partial tokens issued during the 2FA challenge
    if (payload.purpose === "2fa")
      return res.status(401).json({ message: "Complete 2FA verification first" });

    // ── Validate session in DB (allows server-side revocation) ────────────────
    const session = await Session.findOne({
      tokenHash: hashToken(raw),
      expiresAt: { $gt: new Date() },
    });

    if (!session)
      return res.status(401).json({ message: "Session expired or revoked" });

    // ── Load user ─────────────────────────────────────────────────────────────
    const user = await User.findById(payload.id).select("-passwordHash -twoFactorSecret");
    if (!user || !user.isActive)
      return res.status(401).json({ message: "User not found or deactivated" });

    // Keep session fresh
    session.lastActiveAt = new Date();
    await session.save();

    req.user = user;
    next();
  } catch (err) {
    console.error("[authenticate]", err);
    return res.status(500).json({ message: "Server error in auth middleware" });
  }
};

module.exports = { authenticate };