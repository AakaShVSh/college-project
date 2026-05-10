const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },

    // Where the file belongs
    channelId:   { type: mongoose.Schema.Types.ObjectId, ref: "Channel",  default: null },
    subgroupId:  { type: mongoose.Schema.Types.ObjectId, ref: "Subgroup", default: null },
    messageId:   { type: mongoose.Schema.Types.ObjectId, ref: "Message",  default: null },
    taskId:      { type: mongoose.Schema.Types.ObjectId, ref: "Task",     default: null },
    ticketId:    { type: mongoose.Schema.Types.ObjectId, ref: "Ticket",   default: null },

    filename:    { type: String, required: true },
    originalName:{ type: String, required: true },
    mimeType:    { type: String, required: true },
    sizeMB:      { type: Number, required: true },
    url:         { type: String, required: true },

    isDeleted:   { type: Boolean, default: false },
    deletedAt:   { type: Date, default: null },
    deletedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

fileSchema.index({ companyId: 1 });
fileSchema.index({ channelId: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ messageId: 1 });

module.exports = mongoose.model("File", fileSchema);