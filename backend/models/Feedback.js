const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle' },
    type: { type: String, enum: ['peer', 'manager', 'upward'], default: 'peer' },
    rating: { type: Number, min: 1, max: 5, required: true },
    message: { type: String, required: [true, 'Feedback message is required'], trim: true },
    anonymous: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
