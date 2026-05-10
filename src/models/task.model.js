const mongoose = require("mongoose");

const taskCommentSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskHistorySchema = new mongoose.Schema(
  {
    changedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    field:       { type: String, required: true },   // e.g. 'status', 'priority', 'assignees'
    oldValue:    { type: mongoose.Schema.Types.Mixed },
    newValue:    { type: mongoose.Schema.Types.Mixed },
    changedAt:   { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    channelId:   { type: mongoose.Schema.Types.ObjectId, ref: "Channel",  default: null },

    title:       { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignees:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    status: {
      type: String,
      // pending  → employee has not started
      // in_progress → employee working on it
      // submitted → employee marked complete, waiting superior review
      // approved → superior approved / done
      // rejected → superior rejected, needs rework
      enum: ["pending", "in_progress", "submitted", "approved", "rejected"],
      default: "pending",
    },

    dueDate:      { type: Date, default: null },
    completedAt:  { type: Date, default: null },
    approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt:   { type: Date, default: null },

    comments:  [taskCommentSchema],
    history:   [taskHistorySchema],
  },
  { timestamps: true }
);

taskSchema.index({ companyId: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);