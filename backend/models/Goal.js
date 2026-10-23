const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'Cycle', required: true },
    title: { type: String, required: [true, 'Goal title is required'], trim: true },
    description: { type: String, trim: true },
    weight: { type: Number, min: 1, max: 100, default: 20 },
    target: { type: String, trim: true },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    dueDate: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

goalSchema.virtual('status').get(function () {
  if (this.progress >= 100) return 'completed';
  if (this.progress > 0) return 'in_progress';
  return 'not_started';
});
goalSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Goal', goalSchema);
