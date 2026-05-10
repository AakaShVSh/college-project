const mongoose = require("mongoose");

// ── One-on-One Direct Message Thread ─────────────────────────────────────
const directMessageSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // Always exactly 2 participants
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],

    lastMessageId:  { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

// One unique DM thread per pair of users per company
directMessageSchema.index({ companyId: 1, participants: 1 }, { unique: true });

// ── Group DM (private multi-user conversation) ────────────────────────────
const groupDMSchema = new mongoose.Schema(
  {
    companyId:    { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:         { type: String, default: "" },          // optional group name
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessageId:  { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    lastMessageAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

groupDMSchema.index({ companyId: 1 });
groupDMSchema.index({ participants: 1 });

const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);
const GroupDM       = mongoose.model("GroupDM", groupDMSchema);

module.exports = { DirectMessage, GroupDM };