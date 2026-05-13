const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // your existing JWT middleware

const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  updateStatus,
  deleteTask,
  addComment,
  deleteComment,
  getMyTasks,
  getTaskHistory,
} = require("../controllers/taskController");

// ── All routes require authentication ──────────────────────────────────────
router.use(auth);

// ── My Tasks (before /:id to avoid conflict) ───────────────────────────────
router.get("/my", getMyTasks);

// ── CRUD ───────────────────────────────────────────────────────────────────
router.post("/", createTask);
router.get("/", getTasks);
router.get("/:id", getTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

// ── Status Transition ──────────────────────────────────────────────────────
router.patch("/:id/status", updateStatus);

// ── Comments ───────────────────────────────────────────────────────────────
router.post("/:id/comments", addComment);
router.delete("/:id/comments/:commentId", deleteComment);

// ── History ────────────────────────────────────────────────────────────────
router.get("/:id/history", getTaskHistory);

module.exports = router;

/*
  Mount in app.js / server.js:
  ─────────────────────────────
  const taskRoutes = require("./routes/taskRoutes");
  app.use("/api/tasks", taskRoutes);
*/