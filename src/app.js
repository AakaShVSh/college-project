const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ── CORS ────────────────────────────────────────────────────────────────────
   Allowed origins:
     • Production frontend on Render
     • Local Vite dev server (default port 5173)
     • Local Vite on port 3000 (if you override the port)
   Add more entries to ALLOWED_ORIGINS as needed.
*/
const ALLOWED_ORIGINS = [
  "https://ctms-q2z1.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Explicitly handle pre-flight OPTIONS for all routes
app.options("*", cors());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth.routes"));
app.use("/api/channels", require("./routes/channel.routes"));
app.use("/api/messages", require("./routes/message.routes"));
app.use("/api/users",    require("./routes/user.routes"));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date() }));

module.exports = app;