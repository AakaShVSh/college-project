const express = require("express");
const router  = express.Router();

const {
    register, login, logout, logoutAll,
    forgotPassword, resetPassword, changePassword,
    getMe, getSessions, revokeSession,
    enable2FA, verify2FA, disable2FA,
} = require("../controllers/auth.controller");

// ✅ FIXED IMPORT (IMPORTANT)
const { authenticate: protect } = require("../middlewares/protect");

// ── Public ─────────────────────────────────────────────────────────
router.post("/register",        register);
router.post("/login",           login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

// ── Protected ──────────────────────────────────────────────────────
router.post("/logout",          protect, logout);
router.post("/logout-all",      protect, logoutAll);
router.post("/change-password", protect, changePassword);
router.get("/me",               protect, getMe);
router.get("/sessions",         protect, getSessions);
router.delete("/sessions/:sessionId", protect, revokeSession);
router.post("/2fa/enable",      protect, enable2FA);
router.post("/2fa/verify",      protect, verify2FA);
router.post("/2fa/disable",     protect, disable2FA);

module.exports = router;