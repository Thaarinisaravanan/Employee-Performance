// Run with: npm run seed   (wipes the database and adds demo data)
require('node:dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Cycle = require('./models/Cycle');
const Goal = require('./models/Goal');
const Appraisal = require('./models/Appraisal');
const Feedback = require('./models/Feedback');
const { computeFinal, CRITERIA } = require('./utils/score');

const PASSWORD = 'Password@123';
const ratings = (scores) => CRITERIA.map((criteria, i) => ({ criteria, score: scores[i % scores.length] }));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User, Department, Cycle, Goal, Appraisal, Feedback].map((m) => m.deleteMany({})));

  const [eng, sales, hr] = await Department.create([{ name: 'Engineering' }, { name: 'Sales' }, { name: 'Human Resources' }]);

  const admin = await User.create({ name: 'Asha Admin', email: 'admin@epms.com', password: PASSWORD, role: 'admin', department: hr._id, designation: 'HR Head' });
  const m1 = await User.create({ name: 'Manoj Manager', email: 'manager@epms.com', password: PASSWORD, role: 'manager', department: eng._id, designation: 'Engineering Manager' });
  const m2 = await User.create({ name: 'Meena Rao', email: 'meena@epms.com', password: PASSWORD, role: 'manager', department: sales._id, designation: 'Sales Manager' });

  const staff = await User.create([
    { name: 'Eshwar Employee', email: 'employee@epms.com', password: PASSWORD, department: eng._id, manager: m1._id, designation: 'Software Engineer' },
    { name: 'Divya Kumar', email: 'divya@epms.com', password: PASSWORD, department: eng._id, manager: m1._id, designation: 'QA Engineer' },
    { name: 'Karthik S', email: 'karthik@epms.com', password: PASSWORD, department: eng._id, manager: m1._id, designation: 'Frontend Developer' },
    { name: 'Lakshmi N', email: 'lakshmi@epms.com', password: PASSWORD, department: sales._id, manager: m2._id, designation: 'Sales Executive' },
    { name: 'Naveen R', email: 'naveen@epms.com', password: PASSWORD, department: sales._id, manager: m2._id, designation: 'Account Executive' },
  ]);

  const [q1, q2] = await Cycle.create([
    { title: '2026 Q1', startDate: '2026-01-01', endDate: '2026-03-31', status: 'closed' },
    { title: '2026 Q2', startDate: '2026-04-01', endDate: '2026-06-30', status: 'active' },
  ]);

  // Closed cycle: fully completed appraisals so trend charts have data
  const q1Plan = [[90, 4, 5], [70, 3, 4], [85, 4, 4], [60, 3, 3], [95, 5, 4]];
  for (let i = 0; i < staff.length; i += 1) {
    const [progress, mScore, sScore] = q1Plan[i];
    const goals = await Goal.create([
      { employee: staff[i]._id, cycle: q1._id, title: 'Deliver quarterly targets', weight: 60, progress, createdBy: staff[i].manager },
      { employee: staff[i]._id, cycle: q1._id, title: 'Skill development', weight: 40, progress: Math.min(100, progress + 5), createdBy: staff[i].manager },
    ]);
    const managerRatings = ratings([mScore, mScore - 1, mScore, mScore]);
    const selfRatings = ratings([sScore]);
    await Appraisal.create({
      employee: staff[i]._id, reviewer: staff[i].manager, cycle: q1._id, managerRatings, selfRatings,
      managerComments: 'Solid quarter.', selfComments: 'Met my commitments.', status: 'completed', completedAt: new Date(),
      ...computeFinal({ goals, managerRatings, selfRatings }),
    });
  }

  // Active cycle: goals in progress, appraisals waiting
  for (const s of staff) {
    await Goal.create([
      { employee: s._id, cycle: q2._id, title: 'Improve delivery quality', weight: 50, progress: 40 + Math.floor(Math.random() * 50), createdBy: s.manager, dueDate: '2026-06-15' },
      { employee: s._id, cycle: q2._id, title: 'Mentor a new joiner', weight: 30, progress: Math.floor(Math.random() * 100), createdBy: s.manager, dueDate: '2026-06-30' },
    ]);
    await Appraisal.create({ employee: s._id, reviewer: s.manager, cycle: q2._id });
  }

  await Feedback.create([
    { from: staff[1]._id, to: staff[0]._id, cycle: q2._id, rating: 5, message: 'Always unblocks the team quickly.', type: 'peer' },
    { from: staff[2]._id, to: staff[0]._id, cycle: q2._id, rating: 4, message: 'Great code reviews.', type: 'peer', anonymous: true },
    { from: m1._id, to: staff[0]._id, cycle: q2._id, rating: 4, message: 'Take more ownership of planning.', type: 'manager' },
  ]);

  console.log('Seed complete. Log in with password:', PASSWORD);
  console.log('  admin@epms.com | manager@epms.com | employee@epms.com');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
