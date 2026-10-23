const Appraisal = require('../models/Appraisal');
const Cycle = require('../models/Cycle');
const Goal = require('../models/Goal');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { computeFinal, CRITERIA } = require('../utils/score');

const populateAppraisal = (q) =>
  q.populate({ path: 'employee', select: 'name designation department', populate: { path: 'department', select: 'name' } })
    .populate('reviewer', 'name')
    .populate('cycle', 'title status');

const validRatings = (ratings) =>
  Array.isArray(ratings) && ratings.length === CRITERIA.length &&
  ratings.every((r) => CRITERIA.includes(r.criteria) && Number(r.score) >= 1 && Number(r.score) <= 5);

// GET /api/appraisals?cycle=
exports.listAppraisals = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.cycle) filter.cycle = req.query.cycle;
  if (req.user.role === 'employee') filter.employee = req.user._id;
  if (req.user.role === 'manager') filter.$or = [{ reviewer: req.user._id }, { employee: req.user._id }];
  res.json(await populateAppraisal(Appraisal.find(filter).sort('-createdAt')));
});

// GET /api/appraisals/criteria
exports.criteria = (req, res) => res.json(CRITERIA);

// GET /api/appraisals/:id  (includes the goals used for the goal score)
exports.getAppraisal = asyncHandler(async (req, res) => {
  const a = await populateAppraisal(Appraisal.findById(req.params.id));
  if (!a) {
    res.status(404);
    throw new Error('Appraisal not found');
  }
  const id = (x) => String(x._id || x);
  const allowed = req.user.role === 'admin' || id(a.employee) === String(req.user._id) || id(a.reviewer) === String(req.user._id);
  if (!allowed) {
    res.status(403);
    throw new Error('Not allowed');
  }
  const goals = await Goal.find({ employee: id(a.employee), cycle: id(a.cycle) });
  res.json({ appraisal: a, goals });
});

// POST /api/appraisals/generate  (admin) - one appraisal per employee that has a manager
exports.generate = asyncHandler(async (req, res) => {
  const cycle = await Cycle.findById(req.body.cycle);
  if (!cycle) {
    res.status(400);
    throw new Error('Select a cycle first');
  }
  const people = await User.find({ active: true, role: { $in: ['employee', 'manager'] }, manager: { $exists: true, $ne: null } });
  let created = 0;
  for (const p of people) {
    const r = await Appraisal.updateOne(
      { employee: p._id, cycle: cycle._id },
      { $setOnInsert: { employee: p._id, cycle: cycle._id, reviewer: p.manager } },
      { upsert: true }
    );
    if (r.upsertedCount) created += 1;
  }
  res.json({ message: `${created} appraisal(s) created`, created });
});

// PUT /api/appraisals/:id/self  - the employee's self-assessment
exports.submitSelf = asyncHandler(async (req, res) => {
  const a = await Appraisal.findById(req.params.id).populate('cycle', 'status');
  if (!a) {
    res.status(404);
    throw new Error('Appraisal not found');
  }
  if (String(a.employee) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the employee can submit a self-assessment');
  }
  if (a.cycle.status !== 'active') {
    res.status(400);
    throw new Error('This cycle is not active');
  }
  if (a.status === 'completed') {
    res.status(400);
    throw new Error('This appraisal is already completed');
  }
  if (!validRatings(req.body.ratings)) {
    res.status(400);
    throw new Error('Rate every criterion from 1 to 5');
  }
  a.selfRatings = req.body.ratings.map((r) => ({ criteria: r.criteria, score: Number(r.score) }));
  a.selfComments = req.body.comments;
  a.status = 'self_submitted';
  await a.save();
  res.json(await populateAppraisal(Appraisal.findById(a._id)));
});

// PUT /api/appraisals/:id/review  - the manager's review; calculates the final score
exports.submitReview = asyncHandler(async (req, res) => {
  const a = await Appraisal.findById(req.params.id).populate('cycle', 'status');
  if (!a) {
    res.status(404);
    throw new Error('Appraisal not found');
  }
  const isReviewer = String(a.reviewer) === String(req.user._id);
  if (!(isReviewer || req.user.role === 'admin') || String(a.employee) === String(req.user._id)) {
    res.status(403);
    throw new Error('Only the reviewing manager or an admin can complete this review');
  }
  if (a.cycle.status !== 'active') {
    res.status(400);
    throw new Error('This cycle is not active');
  }
  if (!validRatings(req.body.ratings)) {
    res.status(400);
    throw new Error('Rate every criterion from 1 to 5');
  }
  a.managerRatings = req.body.ratings.map((r) => ({ criteria: r.criteria, score: Number(r.score) }));
  a.managerComments = req.body.comments;

  const goals = await Goal.find({ employee: a.employee, cycle: a.cycle._id });
  const { goalScore, finalScore, grade } = computeFinal({
    goals, managerRatings: a.managerRatings, selfRatings: a.selfRatings,
  });
  Object.assign(a, { goalScore, finalScore, grade, status: 'completed', completedAt: new Date() });
  await a.save();
  res.json(await populateAppraisal(Appraisal.findById(a._id)));
});
