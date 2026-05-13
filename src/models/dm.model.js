// src/models/message.model.js
const mongoose = require("mongoose");

/* ── Reaction sub-doc ─────────────────────────────────────────────────────── */
const reactionSchema = new mongoose.Schema(
  {
    emoji:   { type: String, required: true },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

/* ── Read-receipt sub-doc ────────────────────────────────────────────────── */
const readReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ── Attachment sub-doc ──────────────────────────────────────────────────── */
const attachmentSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    filename: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size:     { type: Number, default: 0 },
  },
  { _id: false }
);

/* ── Message ─────────────────────────────────────────────────────────────── */
const messageSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Context: exactly one of these will be set ──
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
      index: true,
    },
    subgroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subgroup",
      default: null,
      index: true,
    },
    dmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DirectMessage",
      default: null,
      index: true,
    },
    groupDmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroupDM",
      default: null,
      index: true,
    },

    // ── Content ──
    content: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    attachments: [attachmentSchema],

    // ── Thread / reply ──
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ── State ──
    isEdited:  { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isPinned:  { type: Boolean, default: false },

    reactions:  [reactionSchema],
    readBy:     [readReceiptSchema],

    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

/* ── Compound indexes for common queries ─────────────────────────────────── */
messageSchema.index({ channelId:  1, createdAt: -1 });
messageSchema.index({ subgroupId: 1, createdAt: -1 });
messageSchema.index({ dmId:       1, createdAt: -1 });
messageSchema.index({ groupDmId:  1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);