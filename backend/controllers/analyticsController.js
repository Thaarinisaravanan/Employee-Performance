const Appraisal = require('../models/Appraisal');
const Goal = require('../models/Goal');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { getScopeIds, canAccessEmployee } = require('../utils/scope');

const round = (n) => Math.round(n * 10) / 10;
const avg = (arr) => (arr.length ? round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0);
const GRADES = ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement'];

// Completed appraisals visible to the requester (team only for managers, everyone for admin)
const visibleAppraisals = async (req, extra = {}) => {
  const ids = await getScopeIds(req.user, req.user.role === 'employee');
  const filter = { ...extra };
  if (ids) filter.employee = { $in: ids };
  if (req.query.cycle) filter.cycle = req.query.cycle;
  return filter;
};

// GET /api/analytics/overview?cycle=
exports.overview = asyncHandler(async (req, res) => {
  const ids = await getScopeIds(req.user, req.user.role === 'employee');
  const appraisalFilter = await visibleAppraisals(req);
  const goalFilter = {};
  if (ids) goalFilter.employee = { $in: ids };
  if (req.query.cycle) goalFilter.cycle = req.query.cycle;

  const [appraisals, goals, headcount] = await Promise.all([
    Appraisal.find(appraisalFilter),
    Goal.find(goalFilter),
    User.countDocuments({ active: true, role: { $ne: 'admin' }, ...(ids && { _id: { $in: ids } }) }),
  ]);

  const completed = appraisals.filter((a) => a.status === 'completed');
  res.json({
    headcount,
    appraisals: {
      total: appraisals.length,
      pending: appraisals.filter((a) => a.status === 'pending').length,
      selfSubmitted: appraisals.filter((a) => a.status === 'self_submitted').length,
      completed: completed.length,
    },
    averageScore: avg(completed.map((a) => a.finalScore)),
    gradeDistribution: GRADES.map((g) => ({ grade: g, count: completed.filter((a) => a.grade === g).length })),
    goals: {
      total: goals.length,
      completed: goals.filter((g) => g.progress >= 100).length,
      averageProgress: avg(goals.map((g) => g.progress)),
    },
  });
});

// GET /api/analytics/departments?cycle=   (admin, manager)
exports.departments = asyncHandler(async (req, res) => {
  const filter = await visibleAppraisals(req, { status: 'completed' });
  const list = await Appraisal.find(filter).populate({ path: 'employee', select: 'department', populate: { path: 'department', select: 'name' } });
  const groups = {};
  list.forEach((a) => {
    const name = a.employee?.department?.name || 'Unassigned';
    (groups[name] = groups[name] || []).push(a.finalScore);
  });
  res.json(Object.entries(groups).map(([department, scores]) => ({ department, averageScore: avg(scores), count: scores.length })));
});

// GET /api/analytics/top-performers?cycle=&limit=
exports.topPerformers = asyncHandler(async (req, res) => {
  const filter = await visibleAppraisals(req, { status: 'completed' });
  const list = await Appraisal.find(filter)
    .sort('-finalScore').limit(Number(req.query.limit) || 5)
    .populate({ path: 'employee', select: 'name designation department', populate: { path: 'department', select: 'name' } })
    .populate('cycle', 'title');
  res.json(list);
});

// GET /api/analytics/trend?employee=   - score history across cycles
exports.trend = asyncHandler(async (req, res) => {
  const employee = req.query.employee || req.user._id;
  if (!(await canAccessEmployee(req.user, employee))) {
    res.status(403);
    throw new Error('Not allowed');
  }
  const list = await Appraisal.find({ employee, status: 'completed' }).populate('cycle', 'title startDate');
  list.sort((a, b) => new Date(a.cycle.startDate) - new Date(b.cycle.startDate));
  res.json(list.map((a) => ({ cycle: a.cycle.title, finalScore: a.finalScore, goalScore: a.goalScore, grade: a.grade })));
});

// GET /api/analytics/report?cycle=   - flat rows for the report table / CSV export
exports.report = asyncHandler(async (req, res) => {
  const filter = await visibleAppraisals(req);
  const list = await Appraisal.find(filter)
    .populate({ path: 'employee', select: 'name designation department', populate: { path: 'department', select: 'name' } })
    .populate('reviewer', 'name').populate('cycle', 'title').sort('-finalScore');
  res.json(list.map((a) => ({
    id: a._id,
    employee: a.employee?.name,
    designation: a.employee?.designation || '',
    department: a.employee?.department?.name || '',
    reviewer: a.reviewer?.name || '',
    cycle: a.cycle?.title || '',
    goalScore: a.goalScore,
    finalScore: a.finalScore,
    grade: a.grade || '',
    status: a.status,
  })));
});
