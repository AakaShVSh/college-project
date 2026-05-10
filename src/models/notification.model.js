const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true }, // recipient

    type: {
      type: String,
      enum: [
        "mention",
        "task_assigned",
        "task_status_changed",
        "ticket_raised",
        "ticket_assigned",
        "ticket_status_changed",
        "ticket_comment",
        "message",
        "direct_message",
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        "channel_invite",
        "subgroup_invite",
      ],
      required: true,
    },

    title:   { type: String, required: true },
    body:    { type: String, required: true },

    // Polymorphic reference — what triggered this notification
    refType: {
      type: String,
      enum: ["Message", "Task", "Ticket", "Leave", "Channel", "Subgroup", "User"],
      default: null,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },

    isRead:   { type: Boolean, default: false },
    readAt:   { type: Date,    default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ companyId: 1 });

module.exports = mongoose.model("Notification", notificationSchema);