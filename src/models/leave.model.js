const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    leaveType: {
      type: String,
      enum: ["sick_leave", "casual_leave", "earned_leave", "unpaid_leave"],
      required: true,
    },

    startDate:   { type: String, required: true },  // "YYYY-MM-DD"
    endDate:     { type: String, required: true },  // "YYYY-MM-DD"
    totalDays:   { type: Number, required: true },

    reason:      { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt:  { type: Date, default: null },
    reviewNote:  { type: String, default: "" },
  },
  { timestamps: true }
);

leaveSchema.index({ companyId: 1 });
leaveSchema.index({ userId: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ userId: 1, startDate: 1 });

module.exports = mongoose.model("Leave", leaveSchema);