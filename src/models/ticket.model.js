const mongoose = require("mongoose");

const ticketCommentSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content:   { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketHistorySchema = new mongoose.Schema(
  {
    changedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    field:      { type: String, required: true },
    oldValue:   { type: mongoose.Schema.Types.Mixed },
    newValue:   { type: mongoose.Schema.Types.Mixed },
    changedAt:  { type: Date, default: Date.now },
  },
  { _id: true }
);

const ticketSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // Ticket can optionally be raised from inside a channel
    channelId:   { type: mongoose.Schema.Types.ObjectId, ref: "Channel", default: null },
    subgroupId:  { type: mongoose.Schema.Types.ObjectId, ref: "Subgroup", default: null },

    ticketNumber: { type: Number, required: true }, // auto-incremented per company

    title:        { type: String, required: true, trim: true },
    description:  { type: String, default: "" },

    raisedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },

    category:    { type: String, default: "" },  // e.g. 'IT', 'HR', 'Finance'
    tags:        [{ type: String }],

    resolvedAt:  { type: Date, default: null },
    closedAt:    { type: Date, default: null },

    comments:    [ticketCommentSchema],
    history:     [ticketHistorySchema],
  },
  { timestamps: true }
);

ticketSchema.index({ companyId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ companyId: 1 });
ticketSchema.index({ raisedBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });

// Auto-increment ticketNumber per company
ticketSchema.pre("save", async function (next) {
  if (this.isNew) {
    const last = await this.constructor
      .findOne({ companyId: this.companyId })
      .sort({ ticketNumber: -1 });
    this.ticketNumber = last ? last.ticketNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model("Ticket", ticketSchema);