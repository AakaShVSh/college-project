const mongoose = require("mongoose");

// ── Sessions ──────────────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash:    { type: String, required: true, unique: true },
    deviceInfo:   { type: String, default: null },
    ipAddress:    { type: String, default: null },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt:    { type: Date, required: true },
  },
  { timestamps: true }
);
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

// ── Password Reset Tokens ─────────────────────────────────────────────────────
const passwordResetSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── 2FA OTPs ──────────────────────────────────────────────────────────────────
const twoFactorSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    otpHash:    { type: String, required: true },
    expiresAt:  { type: Date, required: true },
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
twoFactorSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session       = mongoose.model("Session", sessionSchema);
const PasswordReset = mongoose.model("PasswordReset", passwordResetSchema);
const TwoFactor     = mongoose.model("TwoFactor", twoFactorSchema);

module.exports = { Session, PasswordReset, TwoFactor };