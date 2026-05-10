const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    companyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:             { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    role:             { type: String, enum: ["admin", "superior", "employee"], default: "employee" },
    avatar_url:       { type: String, default: null },
    bio:              { type: String, default: "" },
    designation:      { type: String, default: "" },
    pincode:          { type: String, default: "" },
    state:            { type: String, default: "" },
    country:          { type: String, default: "" },
    isActive:         { type: Boolean, default: true },
    isEmailVerified:  { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret:  { type: String, default: null },
    theme:            { type: String, enum: ["light", "dark"], default: "light" },
    language:         { type: String, default: "en" },
    timezone:         { type: String, default: "UTC" },
    presence: {
      status:     { type: String, enum: ["online", "offline", "away"], default: "offline" },
      lastSeenAt: { type: Date, default: Date.now },
    },
    notificationPreferences: {
      mentions:             { type: Boolean, default: true },
      taskAssignments:      { type: Boolean, default: true },
      ticketUpdates:        { type: Boolean, default: true },
      messages:             { type: Boolean, default: true },
      leaveUpdates:         { type: Boolean, default: true },
      directMessages:       { type: Boolean, default: true },
      emailMentions:        { type: Boolean, default: true },
      emailTaskAssignments: { type: Boolean, default: true },
      emailTicketUpdates:   { type: Boolean, default: true },
      emailLeaveUpdates:    { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("User", userSchema);