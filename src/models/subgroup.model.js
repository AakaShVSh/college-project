const mongoose = require("mongoose");

const subgroupMemberSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    canPost:  { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const subgroupSchema = new mongoose.Schema(
  {
    channelId:      { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    companyId:      { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:           { type: String, required: true, trim: true },
    description:    { type: String, default: "" },
    type:           { type: String, enum: ["general", "help", "ticket", "custom"], default: "custom" },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    members:        [subgroupMemberSchema],
    pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
    isArchived:     { type: Boolean, default: false },
    archivedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

subgroupSchema.index({ channelId: 1 });
subgroupSchema.index({ companyId: 1 });

module.exports = mongoose.model("Subgroup", subgroupSchema);