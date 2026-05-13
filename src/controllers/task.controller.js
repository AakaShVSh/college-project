const Task = require("../models/Task");
const mongoose = require("mongoose");

// ─── Helpers ────────────────────────────────────────────────────────────────

const recordHistory = (task, changedBy, field, oldValue, newValue) => {
  task.history.push({ changedBy, field, oldValue, newValue });
};

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─── CREATE ─────────────────────────────────────────────────────────────────

/**
 * POST /tasks
 * Body: { title, description, channelId, assignees, priority, dueDate }
 * Auth: any authenticated user in the company
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, channelId, assignees, priority, dueDate } =
      req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required." });
    }

    const task = await Task.create({
      companyId: req.user.companyId,
      channelId: channelId || null,
      title: title.trim(),
      description: description || "",
      createdBy: req.user._id,
      assignees: assignees || [],
      priority: priority || "medium",
      dueDate: dueDate || null,
    });

    await task.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "assignees", select: "name email avatar" },
    ]);

    return res.status(201).json({ task });
  } catch (err) {
    console.error("createTask:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── LIST ────────────────────────────────────────────────────────────────────

/**
 * GET /tasks
 * Query: status, priority, assigneeId, channelId, page, limit, search, sortBy, sortOrder
 */
exports.getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assigneeId,
      channelId,
      page = 1,
      limit = 20,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { companyId: req.user.companyId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (channelId) filter.channelId = channelId;
    if (assigneeId && isObjectId(assigneeId))
      filter.assignees = new mongoose.Types.ObjectId(assigneeId);
    if (search) filter.title = { $regex: search, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate("createdBy", "name email avatar")
        .populate("assignees", "name email avatar")
        .populate("approvedBy", "name email avatar")
        .lean(),
      Task.countDocuments(filter),
    ]);

    return res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error("getTasks:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── SINGLE ──────────────────────────────────────────────────────────────────

/**
 * GET /tasks/:id
 */
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .populate("createdBy", "name email avatar")
      .populate("assignees", "name email avatar")
      .populate("approvedBy", "name email avatar")
      .populate("comments.userId", "name email avatar")
      .populate("history.changedBy", "name email avatar");

    if (!task) return res.status(404).json({ message: "Task not found." });

    return res.json({ task });
  } catch (err) {
    console.error("getTask:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * PATCH /tasks/:id
 * Body: { title, description, assignees, priority, dueDate, channelId }
 * Tracks history for each changed field.
 */
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    const editableFields = [
      "title",
      "description",
      "assignees",
      "priority",
      "dueDate",
      "channelId",
    ];

    for (const field of editableFields) {
      if (req.body[field] === undefined) continue;

      const oldValue = task[field];
      const newValue = req.body[field];

      // Skip if no real change (simple stringify comparison)
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;

      recordHistory(task, req.user._id, field, oldValue, newValue);
      task[field] = newValue;
    }

    await task.save();
    await task.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "assignees", select: "name email avatar" },
    ]);

    return res.json({ task });
  } catch (err) {
    console.error("updateTask:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── STATUS TRANSITIONS ──────────────────────────────────────────────────────

/**
 * PATCH /tasks/:id/status
 * Body: { status }
 *
 * Allowed transitions:
 *   Employee:  pending → in_progress → submitted
 *   Superior:  submitted → approved | rejected
 *              rejected  → in_progress  (re-open)
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const VALID_STATUSES = [
      "pending",
      "in_progress",
      "submitted",
      "approved",
      "rejected",
    ];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    const from = task.status;
    const to = status;
    const role = req.user.role; // "employee" | "manager" | "admin"

    // ── Transition guard ──
    const employeeAllowed = {
      pending: ["in_progress"],
      in_progress: ["submitted"],
      rejected: ["in_progress"],
    };
    const superiorAllowed = {
      submitted: ["approved", "rejected"],
    };

    const isSuperior = ["manager", "admin"].includes(role);
    const isAssignee = task.assignees.some(
      (a) => a.toString() === req.user._id.toString()
    );

    let allowed = false;

    if (isSuperior && superiorAllowed[from]?.includes(to)) {
      allowed = true;
    } else if (isAssignee && employeeAllowed[from]?.includes(to)) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({
        message: `Transition from '${from}' to '${to}' is not allowed for your role.`,
      });
    }

    // ── Side-effects ──
    recordHistory(task, req.user._id, "status", from, to);
    task.status = to;

    if (to === "approved") {
      task.approvedBy = req.user._id;
      task.approvedAt = new Date();
      task.completedAt = new Date();
    }
    if (to === "rejected") {
      task.approvedBy = null;
      task.approvedAt = null;
      task.completedAt = null;
    }

    await task.save();
    await task.populate([
      { path: "createdBy", select: "name email avatar" },
      { path: "assignees", select: "name email avatar" },
      { path: "approvedBy", select: "name email avatar" },
    ]);

    return res.json({ task });
  } catch (err) {
    console.error("updateStatus:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── DELETE ──────────────────────────────────────────────────────────────────

/**
 * DELETE /tasks/:id
 * Only the creator or a superior can delete.
 */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    const isSuperior = ["manager", "admin"].includes(req.user.role);
    const isCreator =
      task.createdBy.toString() === req.user._id.toString();

    if (!isSuperior && !isCreator) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this task." });
    }

    await task.deleteOne();
    return res.json({ message: "Task deleted." });
  } catch (err) {
    console.error("deleteTask:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── COMMENTS ────────────────────────────────────────────────────────────────

/**
 * POST /tasks/:id/comments
 * Body: { content }
 */
exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ message: "Comment content is required." });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    task.comments.push({ userId: req.user._id, content: content.trim() });
    await task.save();
    await task.populate("comments.userId", "name email avatar");

    const comment = task.comments[task.comments.length - 1];
    return res.status(201).json({ comment });
  } catch (err) {
    console.error("addComment:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

/**
 * DELETE /tasks/:id/comments/:commentId
 * Only the comment author or a superior can delete.
 */
exports.deleteComment = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    });
    if (!task) return res.status(404).json({ message: "Task not found." });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const isSuperior = ["manager", "admin"].includes(req.user.role);
    const isAuthor =
      comment.userId.toString() === req.user._id.toString();

    if (!isSuperior && !isAuthor) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment." });
    }

    comment.deleteOne();
    await task.save();
    return res.json({ message: "Comment deleted." });
  } catch (err) {
    console.error("deleteComment:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── MY TASKS ────────────────────────────────────────────────────────────────

/**
 * GET /tasks/my
 * Returns tasks where req.user is an assignee, grouped by status.
 */
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      companyId: req.user.companyId,
      assignees: req.user._id,
    })
      .sort({ dueDate: 1, createdAt: -1 })
      .populate("createdBy", "name email avatar")
      .populate("assignees", "name email avatar")
      .lean();

    // Group by status
    const grouped = tasks.reduce((acc, t) => {
      (acc[t.status] = acc[t.status] || []).push(t);
      return acc;
    }, {});

    return res.json({ tasks, grouped });
  } catch (err) {
    console.error("getMyTasks:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

// ─── HISTORY ─────────────────────────────────────────────────────────────────

/**
 * GET /tasks/:id/history
 */
exports.getTaskHistory = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
    })
      .select("history")
      .populate("history.changedBy", "name email avatar");

    if (!task) return res.status(404).json({ message: "Task not found." });

    return res.json({ history: task.history });
  } catch (err) {
    console.error("getTaskHistory:", err);
    return res.status(500).json({ message: "Server error." });
  }
};