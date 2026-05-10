const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    action: {
      type: String,
      enum: [
        // Auth
        "user_login",
        "user_logout",
        "user_logout_all_devices",
        "password_changed",
        "two_factor_enabled",
        "two_factor_disabled",
        // Members
        "member_added",
        "member_removed",
        "member_role_changed",
        // Channels
        "channel_created",
        "channel_archived",
        "channel_deleted",
        "channel_updated",
        // Subgroups
        "subgroup_created",
        "subgroup_archived",
        "subgroup_deleted",
        "subgroup_updated",
        // Messages
        "message_edited",
        "message_deleted",
        "message_pinned",
        "message_unpinned",
        // Tasks
        "task_created",
        "task_updated",
        "task_status_changed",
        "task_deleted",
        // Tickets
        "ticket_created",
        "ticket_assigned",
        "ticket_status_changed",
        "ticket_deleted",
        // Attendance
        "attendance_check_in",
        "attendance_check_out",
        "attendance_overridden",
        // Leave
        "leave_requested",
        "leave_approved",
        "leave_rejected",
        // Files
        "file_uploaded",
        "file_deleted",
        // Company
        "company_settings_updated",
        "leave_policy_updated",
      ],
      required: true,
    },

    // Polymorphic target
    targetType: {
      type: String,
      enum: ["User", "Channel", "Subgroup", "Message", "Task", "Ticket", "Attendance", "Leave", "File", "Company"],
      default: null,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },

    metadata:  { type: mongoose.Schema.Types.Mixed, default: {} }, // extra context
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);