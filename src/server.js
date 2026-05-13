const http    = require("http");
const { Server } = require("socket.io");
const app     = require("./app");
const connect = require("./configs/db");
require("dotenv").config();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

/* ── Allowed origins (keep in sync with app.js) ─────────────────────────── */
const ALLOWED_ORIGINS = [
  "https://ctms-q2z1.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

/* ── Socket.IO ───────────────────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow no-origin requests (server-to-server, Postman)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`Socket CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Recommended: prefer websocket, fall back to polling
  transports: ["websocket", "polling"],
});

/* ── Socket event handlers ───────────────────────────────────────────────── */
io.on("connection", (socket) => {
  console.log(`[socket] connected   ${socket.id}`);

  /* Join a personal room keyed by userId so we can target a specific user */
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(String(userId));
    console.log(`[socket] ${socket.id} joined room ${userId}`);
  });

  /* Join a channel / subgroup room for broadcast */
  socket.on("join_channel", (channelId) => {
    if (!channelId) return;
    socket.join(`channel:${channelId}`);
  });

  socket.on("leave_channel", (channelId) => {
    if (!channelId) return;
    socket.leave(`channel:${channelId}`);
  });

  /* Real-time message broadcast helper
     Client emits: { roomType: "channel"|"dm", roomId, message }
     Server fans out to everyone else in that room               */
  socket.on("send_message", ({ roomType, roomId, message }) => {
    if (!roomType || !roomId || !message) return;
    const room = `${roomType}:${roomId}`;
    socket.to(room).emit("new_message", message);
  });

  /* Typing indicators */
  socket.on("typing_start", ({ roomType, roomId, user }) => {
    const room = `${roomType}:${roomId}`;
    socket.to(room).emit("user_typing", { user });
  });

  socket.on("typing_stop", ({ roomType, roomId, user }) => {
    const room = `${roomType}:${roomId}`;
    socket.to(room).emit("user_stopped_typing", { user });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[socket] disconnected ${socket.id} — ${reason}`);
  });
});

/* Expose io so controllers can emit events (e.g. require('../server').io) */
module.exports.io = io;

/* ── Start ───────────────────────────────────────────────────────────────── */
server.listen(port, async () => {
  try {
    await connect();
    console.log(`[server] running on port ${port}`);
  } catch (error) {
    console.error("[server] DB connection failed:", error);
    process.exit(1);
  }
});