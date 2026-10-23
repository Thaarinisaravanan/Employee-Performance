const Goal = require('../models/Goal');
const Cycle = require('../models/Cycle');
const asyncHandler = require('../utils/asyncHandler');
const { getScopeIds, canAccessEmployee } = require('../utils/scope');

const populateGoal = (q) => q.populate('employee', 'name designation').populate('cycle', 'title status');

// GET /api/goals?cycle=&employee=
exports.listGoals = asyncHandler(async (req, res) => {
  const ids = await getScopeIds(req.user, true);
  const filter = {};
  if (ids) filter.employee = { $in: ids };
  if (req.query.cycle) filter.cycle = req.query.cycle;
  if (req.query.employee) {
    if (!(await canAccessEmployee(req.user, req.query.employee))) {
      res.status(403);
      throw new Error('Not allowed to view this employee');
    }
    filter.employee = req.query.employee;
  }
  res.json(await populateGoal(Goal.find(filter).sort('-createdAt')));
});

// POST /api/goals  - employees create for themselves, managers for their team, admin for anyone
exports.createGoal = asyncHandler(async (req, res) => {
  const employee = req.body.employee || req.user._id;
  if (!(await canAccessEmployee(req.user, employee))) {
    res.status(403);
    throw new Error('You can only set goals for yourself or your team');
  }
  const cycle = await Cycle.findById(req.body.cycle);
  if (!cycle) {
    res.status(400);
    throw new Error('Select a valid evaluation cycle');
  }
  if (cycle.status === 'closed') {
    res.status(400);
    throw new Error('This cycle is closed');
  }
  const { title, description, weight, target, dueDate } = req.body;
  const goal = await Goal.create({
    employee, cycle: cycle._id, title, description, weight, target, dueDate, createdBy: req.user._id,
  });
  res.status(201).json(await populateGoal(Goal.findById(goal._id)));
});

// PUT /api/goals/:id  - employees may only update progress on their own goals
exports.updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id).populate('cycle', 'status');
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }
  if (!(await canAccessEmployee(req.user, goal.employee))) {
    res.status(403);
    throw new Error('Not allowed');
  }
  if (goal.cycle.status === 'closed') {
    res.status(400);
    throw new Error('This cycle is closed');
  }
  const isOwnerOnly = req.user.role === 'employee';
  const fields = isOwnerOnly ? ['progress'] : ['title', 'description', 'weight', 'target', 'dueDate', 'progress'];
  fields.forEach((f) => { if (req.body[f] !== undefined) goal[f] = req.body[f]; });
  await goal.save();
  res.json(await populateGoal(Goal.findById(goal._id)));
});

// DELETE /api/goals/:id  - managers (of that employee) and admin
exports.deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }
  if (req.user.role === 'employee' || !(await canAccessEmployee(req.user, goal.employee))) {
    res.status(403);
    throw new Error('Not allowed');
  }
  await goal.deleteOne();
  res.json({ message: 'Goal deleted' });
});
