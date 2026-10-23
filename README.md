# Employee Performance Evaluation and Management System (MERN)

Roles: **Admin**, **Manager**, **Employee**
Modules: Authentication · Goal Management · Appraisal · Feedback · Analytics & Reporting · Admin

## Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

## Run it
Open two terminals in VS Code (Terminal > New Terminal).

**Terminal 1 - backend**
```bash
cd backend
npm install
# edit .env if your MongoDB URI is different
npm run seed      # optional: loads demo users, goals, appraisals
npm run dev       # http://localhost:5000
```

**Terminal 2 - frontend**
```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

## Demo logins (after `npm run seed`)
| Role | Email | Password |
|---|---|---|
| Admin | admin@epms.com | Password@123 |
| Manager | manager@epms.com | Password@123 |
| Employee | employee@epms.com | Password@123 |

## Who can do what
| Feature | Admin | Manager | Employee |
|---|---|---|---|
| Manage users, departments, cycles | Yes | - | - |
| Create appraisals for a cycle | Yes | - | - |
| Set goals | Anyone | Own team + self | Self |
| Update goal progress | Anyone | Own team + self | Own goals |
| Self-assessment | - | Own | Own |
| Review / score an employee | Yes | Direct reports | - |
| Give feedback | Yes | Yes | Yes |
| See team feedback | All | Own team | - |
| Dashboard | Company | Team | Personal |
| Reports and CSV export | All | Team | - |

## Score formula (backend/utils/score.js)
```
Final = Goal achievement x 50% + Manager rating x 30% + Self rating x 20%
```
Ratings (1-5) are converted to 0-100. If a part is missing (e.g. no goals) the remaining weights are re-scaled.
Grades: 90+ Outstanding, 75-89 Exceeds, 60-74 Meets, below 60 Needs Improvement.

## Typical workflow
1. Admin creates a department, users and an evaluation cycle, then activates the cycle.
2. Managers (or employees) add goals; employees update progress during the cycle.
3. Admin clicks "Create appraisals for this cycle".
4. Employees submit self-assessments; managers complete reviews. The final score is calculated automatically.
5. Everyone gives feedback along the way; admin/managers view dashboards and export reports.

## API summary
| Prefix | Purpose |
|---|---|
| `/api/auth` | register, login, me, password |
| `/api/admin` | users, departments, cycles |
| `/api/users` | team and directory lookups |
| `/api/goals` | goal CRUD (role-scoped) |
| `/api/appraisals` | list, generate, self, review |
| `/api/feedback` | give, received, given, team |
| `/api/analytics` | overview, trend, departments, top-performers, report |
