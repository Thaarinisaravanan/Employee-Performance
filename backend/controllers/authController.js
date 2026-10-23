const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

const sendAuth = (res, user, status = 200) => {
  const safe = user.toObject();
  delete safe.password;
  res.status(status).json({ token: signToken(user._id), user: safe });
};

// POST /api/auth/register  (public sign-up always creates an employee)
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email: (email || '').toLowerCase() })) {
    res.status(400);
    throw new Error('Email already registered');
  }
  const user = await User.create({ name, email, password, role: 'employee' });
  sendAuth(res, user, 201);
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Incorrect email or password');
  }
  if (!user.active) {
    res.status(403);
    throw new Error('This account has been deactivated');
  }
  sendAuth(res, user);
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('department', 'name').populate('manager', 'name');
  res.json(user);
});

// PUT /api/auth/password
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword || ''))) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});
