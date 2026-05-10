const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connect = require("./configs/db");
require("dotenv").config();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// ✅ ENABLE SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ✅ BASIC SOCKET HANDLER (for now)
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    console.log("User joined:", userId);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ── Start ─────────────────────────
server.listen(port, async () => {
  try {
    await connect();
    console.log("running on port", port);
  } catch (error) {
    console.log(error);
  }
});