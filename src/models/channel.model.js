const mongoose = require("mongoose");

const channelMemberSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    canPost:  { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const channelSchema = new mongoose.Schema(
  {
    companyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:           { type: String, required: true, trim: true },
    description:    { type: String, default: "" },
    icon_url:       { type: String, default: null },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members:        [channelMemberSchema],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    isArchived:     { type: Boolean, default: false },
    archivedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

channelSchema.index({ companyId: 1 });
channelSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Channel", channelSchema);