const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name:                { type: String, required: true, trim: true },
    address:             { type: String, trim: true, default: "" },
    email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:        { type: String, required: true },
    logo_url:            { type: String, default: null },
    allowedEmailDomains: [{ type: String }],
    workStartTime:       { type: String, default: "09:00" },
    workEndTime:         { type: String, default: "18:00" },
    workingDays:         { type: [String], default: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    storageLimitMB:      { type: Number, default: 10240 },
    storageUsedMB:       { type: Number, default: 0 },
    leavePolicy: {
      sickLeave:   { type: Number, default: 12 },
      casualLeave: { type: Number, default: 12 },
      earnedLeave: { type: Number, default: 15 },
      unpaidLeave: { type: Number, default: 30 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", companySchema);