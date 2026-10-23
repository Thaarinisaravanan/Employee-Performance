const User = require('../models/User');

// Returns null for "everyone" (admin) or an array of user ids the requester may see
exports.getScopeIds = async (user, includeSelf = true) => {
  if (user.role === 'admin') return null;
  if (user.role === 'manager') {
    const team = await User.find({ manager: user._id, active: true }).select('_id');
    const ids = team.map((t) => t._id);
    return includeSelf ? [user._id, ...ids] : ids;
  }
  return [user._id];
};

exports.canAccessEmployee = async (user, employeeId) => {
  if (user.role === 'admin') return true;
  if (String(user._id) === String(employeeId)) return true;
  if (user.role === 'manager') return !!(await User.exists({ _id: employeeId, manager: user._id }));
  return false;
};
