const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getScopeIds } = require('../utils/scope');

// GET /api/users/team  - people the requester can set goals / review for
exports.team = asyncHandler(async (req, res) => {
  const ids = await getScopeIds(req.user, true);
  const filter = { active: true, ...(ids && { _id: { $in: ids } }) };
  res.json(await User.find(filter).select('name email role designation department manager').populate('department', 'name').sort('name'));
});

// GET /api/users/directory - everyone active (used for choosing who to give feedback to)
exports.directory = asyncHandler(async (req, res) => {
  const users = await User.find({ active: true, _id: { $ne: req.user._id } })
    .select('name role designation').sort('name');
  res.json(users);
});
