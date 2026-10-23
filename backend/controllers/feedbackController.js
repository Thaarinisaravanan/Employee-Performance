const Feedback = require('../models/Feedback');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getScopeIds } = require('../utils/scope');

// Hide the sender on anonymous feedback unless the viewer is an admin
const mask = (items, viewer) =>
  items.map((f) => {
    const o = f.toObject();
    if (o.anonymous && viewer.role !== 'admin') o.from = { name: 'Anonymous' };
    return o;
  });

// POST /api/feedback
exports.give = asyncHandler(async (req, res) => {
  const { to, message, rating, type, anonymous, cycle } = req.body;
  if (String(to) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot give feedback to yourself');
  }
  if (!(await User.exists({ _id: to, active: true }))) {
    res.status(400);
    throw new Error('Choose a valid colleague');
  }
  const fb = await Feedback.create({
    from: req.user._id, to, message, rating, cycle: cycle || undefined,
    type: type || 'peer', anonymous: !!anonymous,
  });
  res.status(201).json(fb);
});

// GET /api/feedback/received
exports.received = asyncHandler(async (req, res) => {
  const items = await Feedback.find({ to: req.user._id })
    .populate('from', 'name designation').populate('to', 'name').populate('cycle', 'title').sort('-createdAt');
  res.json(mask(items, req.user));
});

// GET /api/feedback/given
exports.given = asyncHandler(async (req, res) => {
  res.json(await Feedback.find({ from: req.user._id }).populate('to', 'name designation').populate('cycle', 'title').sort('-createdAt'));
});

// GET /api/feedback/team  (manager: own team, admin: everyone)
exports.team = asyncHandler(async (req, res) => {
  const ids = await getScopeIds(req.user, false);
  const filter = ids ? { to: { $in: ids } } : {};
  const items = await Feedback.find(filter)
    .populate('from', 'name designation').populate('to', 'name designation').populate('cycle', 'title')
    .sort('-createdAt').limit(200);
  res.json(mask(items, req.user));
});

// DELETE /api/feedback/:id  (author or admin)
exports.remove = asyncHandler(async (req, res) => {
  const fb = await Feedback.findById(req.params.id);
  if (!fb) {
    res.status(404);
    throw new Error('Feedback not found');
  }
  if (req.user.role !== 'admin' && String(fb.from) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not allowed');
  }
  await fb.deleteOne();
  res.json({ message: 'Feedback deleted' });
});
