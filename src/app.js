const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");  // FIX: required for req.cookies to work

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());   // must come before routes

app.use(cors({
  origin: "https://ctms-q2z1.onrender.com", // your Vite frontend
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth.routes"));
app.use("/api/channels", require("./routes/channel.routes"));
app.use("/api/messages", require("./routes/message.routes"));
app.use("/api/users",    require("./routes/user.routes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date() }));

module.exports = app;