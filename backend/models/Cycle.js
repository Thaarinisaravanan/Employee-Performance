const mongoose = require('mongoose');

const cycleSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Cycle title is required'], trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cycle', cycleSchema);
