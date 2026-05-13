// const jwt    = require("jsonwebtoken");
// const crypto = require("crypto");
// const { Session } = require("../models/auth.model");

// const JWT_SECRET = "gi7gug9ug9o88iohoyyyyyyy89yuyuuyuuuuuy8676rrr6rr" || "changeme";

// const hashToken = (raw) =>
//   crypto.createHash("sha256").update(raw).digest("hex");

// const authenticate = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization || "";
//     const raw = authHeader.startsWith("Bearer ")
//       ? authHeader.slice(7)
//       : null;

//     if (!raw) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     let payload;
//     try {
//       payload = jwt.verify(raw, JWT_SECRET);
//     } catch {
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }

//     if (payload.purpose === "2fa") {
//       return res.status(401).json({ message: "Complete 2FA verification first" });
//     }

//     const tokenHash = hashToken(raw);

//     const session = await Session.findOne({
//       tokenHash,
//       expiresAt: { $gt: new Date() },
//     });

//     if (!session) {
//       return res.status(401).json({ message: "Session expired or revoked" });
//     }

//     session.lastActiveAt = new Date();
//     await session.save();

//     req.user = { userId: payload.userId };
//     next();
//   } catch (err) {
//     console.error("[authenticate]", err);
//     return res.status(500).json({ message: "Server error in auth middleware" });
//   }
// };

// module.exports = { authenticate };



const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const User    = require("../models/user.model");
const { Session } = require("../models/auth.model");

const JWT_SECRET = process.env.JWT_SECRET || "gjashduyqw98wyhdsd89ywdiy9wy8adusd9y0jdoi0w9yuwid8qwyddiqwpe9";

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

const authenticate = async (req, res, next) => {
  try {
    // Accept token from Authorization header or cookie
    const authHeader = req.headers.authorization || "";
    const raw =
      authHeader.startsWith("Bearer ") ? authHeader.slice(7)
      : req.cookies?.token             ? req.cookies.token
      : null;

    if (!raw)
      return res.status(401).json({ message: "No token provided" });

    let payload;
    try {
      console.log(raw,JWT_SECRET);
      
      payload = jwt.verify(raw, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (payload.purpose === "2fa")
      return res.status(401).json({ message: "Complete 2FA verification first" });

    const session = await Session.findOne({
      tokenHash: hashToken(raw),
      expiresAt: { $gt: new Date() },
    });

    if (!session)
      return res.status(401).json({ message: "Session expired or revoked" });

    // Attach full user document so controllers can use req.user._id, req.user.companyId etc.
    const user = await User.findById(payload.id).select("-passwordHash -twoFactorSecret");
    if (!user || !user.isActive)
      return res.status(401).json({ message: "User not found or deactivated" });

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