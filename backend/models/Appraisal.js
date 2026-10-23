const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  { criteria: { type: String, required: true }, score: { type: Number, min: 1, max: 5, required: true } },
  { _id: false }
);

const appraisalSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle', required: true },
    selfRatings: [ratingSchema],
    selfComments: String,
    managerRatings: [ratingSchema],
    managerComments: String,
    goalScore: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    grade: String,
    status: { type: String, enum: ['pending', 'self_submitted', 'completed'], default: 'pending' },
    completedAt: Date,
  },
  { timestamps: true }
);

appraisalSchema.index({ employee: 1, cycle: 1 }, { unique: true });

module.exports = mongoose.model('Appraisal', appraisalSchema);
