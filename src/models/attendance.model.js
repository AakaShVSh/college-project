const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    date:       { type: String, required: true }, // "YYYY-MM-DD" — easy to query by day

    checkIns: [
      {
        time:      { type: Date, required: true },
        ipAddress: { type: String, default: null },
        _id: false,
      },
    ],

    checkOuts: [
      {
        time:      { type: Date, required: true },
        ipAddress: { type: String, default: null },
        _id: false,
      },
    ],

    totalWorkMinutes: { type: Number, default: 0 },

    // Computed / overridden by admin
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "on_leave"],
      default: "absent",
    },

    // Admin override note
    note: { type: String, default: "" },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // if admin overrides
  },
  { timestamps: true }
);

attendanceSchema.index({ companyId: 1, date: 1 });
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, userId: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);