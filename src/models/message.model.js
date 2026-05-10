const mongoose = require("mongoose");

// Reactions sub-doc
const reactionSchema = new mongoose.Schema(
  {
    emoji:   { type: String, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

// Read receipts sub-doc
const readReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Attachment sub-doc
const attachmentSchema = new mongoose.Schema(
  {
    url:       { type: String, required: true },
    filename:  { type: String, required: true },
    mimeType:  { type: String, required: true },
    sizeMB:    { type: Number, required: true },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    senderId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Where the message lives — exactly ONE of these will be set
    channelId:    { type: mongoose.Schema.Types.ObjectId, ref: "Channel",  default: null },
    subgroupId:   { type: mongoose.Schema.Types.ObjectId, ref: "Subgroup", default: null },
    dmId:         { type: mongoose.Schema.Types.ObjectId, ref: "DirectMessage", default: null },
    groupDmId:    { type: mongoose.Schema.Types.ObjectId, ref: "GroupDM",  default: null },

    content:   { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "image", "video", "file", "system"],
      default: "text",
    },

    attachments:  [attachmentSchema],

    // Threaded reply — references parent message
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },

    // Mentions
    mentionedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mentionedAll:   { type: Boolean, default: false },

    reactions:    [reactionSchema],
    readBy:       [readReceiptSchema],

    isEdited:     { type: Boolean, default: false },
    editedAt:     { type: Date, default: null },

    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ subgroupId: 1, createdAt: -1 });
messageSchema.index({ dmId: 1, createdAt: -1 });
messageSchema.index({ groupDmId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ parentMessageId: 1 });
messageSchema.index({ companyId: 1, content: "text" }); // full-text search

module.exports = mongoose.model("Message", messageSchema);