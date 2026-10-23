const User = require('../models/User');
const Department = require('../models/Department');
const Cycle = require('../models/Cycle');
const asyncHandler = require('../utils/asyncHandler');

/* ---------- Users ---------- */
exports.listUsers = asyncHandler(async (req, res) => {
  const { search, role, department } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const users = await User.find(filter)
    .populate('department', 'name')
    .populate('manager', 'name')
    .sort('name');
  res.json(users);
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, department, manager, designation, joinDate } = req.body;
  const user = await User.create({
    name, email, password: password || 'Password@123', role,
    department: department || undefined, manager: manager || undefined, designation, joinDate,
  });
  res.status(201).json(await User.findById(user._id).populate('department', 'name').populate('manager', 'name'));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  ['name', 'email', 'role', 'designation', 'joinDate', 'active'].forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  user.department = req.body.department || undefined;
  user.manager = req.body.manager || undefined;
  if (req.body.password) user.password = req.body.password;
  if (String(user._id) === String(user.manager)) {
    res.status(400);
    throw new Error('A user cannot be their own manager');
  }
  await user.save();
  res.json(await User.findById(user._id).populate('department', 'name').populate('manager', 'name'));
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }
  await User.findByIdAndDelete(req.params.id);
  await User.updateMany({ manager: req.params.id }, { $unset: { manager: 1 } });
  res.json({ message: 'User deleted' });
});

/* ---------- Departments ---------- */
exports.listDepartments = asyncHandler(async (req, res) => res.json(await Department.find().sort('name')));
exports.createDepartment = asyncHandler(async (req, res) =>
  res.status(201).json(await Department.create({ name: req.body.name })));
exports.updateDepartment = asyncHandler(async (req, res) =>
  res.json(await Department.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true, runValidators: true })));
exports.deleteDepartment = asyncHandler(async (req, res) => {
  if (await User.exists({ department: req.params.id })) {
    res.status(400);
    throw new Error('Department still has employees. Reassign them first.');
  }
  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: 'Department deleted' });
});

/* ---------- Evaluation cycles ---------- */
exports.listCycles = asyncHandler(async (req, res) => res.json(await Cycle.find().sort('-startDate')));
exports.createCycle = asyncHandler(async (req, res) => {
  const { title, startDate, endDate, status } = req.body;
  if (new Date(endDate) <= new Date(startDate)) {
    res.status(400);
    throw new Error('End date must be after start date');
  }
  res.status(201).json(await Cycle.create({ title, startDate, endDate, status }));
});
exports.updateCycle = asyncHandler(async (req, res) =>
  res.json(await Cycle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })));
exports.deleteCycle = asyncHandler(async (req, res) => {
  await Cycle.findByIdAndDelete(req.params.id);
  res.json({ message: 'Cycle deleted' });
});
