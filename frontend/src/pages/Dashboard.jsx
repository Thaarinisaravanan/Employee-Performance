import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge, CycleSelect, Empty, ScoreRing, useCycles } from '../components/ui.jsx';

const Stat = ({ label, value, note }) => (
  <div className="stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const { cycles, cycle, setCycle } = useCycles();
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [depts, setDepts] = useState([]);
  const [top, setTop] = useState([]);
  const isLead = user.role !== 'employee';

  useEffect(() => { api.get('/analytics/trend').then(setTrend).catch(() => {}); }, []);
  useEffect(() => {
    if (!cycle) return;
    api.get(`/analytics/overview?cycle=${cycle}`).then(setOverview);
    if (isLead) {
      api.get(`/analytics/departments?cycle=${cycle}`).then(setDepts);
      api.get(`/analytics/top-performers?cycle=${cycle}`).then(setTop);
    }
  }, [cycle, isLead]);

  const latest = trend[trend.length - 1];

  return (
    <>
      <header className="page-head">
        <div><h1>Welcome back, {user.name.split(' ')[0]}</h1><p className="muted">{user.role === 'admin' ? 'Company-wide view' : isLead ? 'Your team at a glance' : 'Your progress this cycle'}</p></div>
        <CycleSelect cycles={cycles} value={cycle} onChange={setCycle} />
      </header>

      <section className="hero">
        <div className="hero-score">
          {latest ? <ScoreRing score={latest.finalScore} grade={latest.grade} /> : <Empty>No completed appraisal for you yet.</Empty>}
          <div><h2>Your latest score</h2><p className="muted">{latest ? `From ${latest.cycle}. Goals count for 50%, manager rating 30%, self rating 20%.` : 'Your score appears here once your manager completes a review.'}</p></div>
        </div>
        {overview && (
          <div className="stats">
            <Stat label={isLead ? 'People' : 'Goals'} value={isLead ? overview.headcount : overview.goals.total} />
            <Stat label="Average goal progress" value={`${overview.goals.averageProgress}%`} note={`${overview.goals.completed} of ${overview.goals.total} goals done`} />
            <Stat label="Appraisals completed" value={`${overview.appraisals.completed}/${overview.appraisals.total}`} note={`${overview.appraisals.pending} not started`} />
            <Stat label="Average score" value={overview.averageScore || '—'} />
          </div>
        )}
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Score history</h2>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trend}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="cycle" /><YAxis domain={[0, 100]} /><Tooltip />
                <Line type="monotone" dataKey="finalScore" name="Final score" stroke="var(--accent)" strokeWidth={2.5} /><Line type="monotone" dataKey="goalScore" name="Goal score" stroke="var(--amber)" strokeWidth={2} strokeDasharray="4 4" /></LineChart>
            </ResponsiveContainer>
          ) : <Empty>Completed cycles will show up here.</Empty>}
        </section>

        {overview && (
          <section className="panel">
            <h2>Grade distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={overview.gradeDistribution}><CartesianGrid stroke="var(--line)" vertical={false} /><XAxis dataKey="grade" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name="People" fill="var(--accent)" radius={[3, 3, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {isLead && (
          <section className="panel">
            <h2>Average score by department</h2>
            {depts.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={depts} layout="vertical"><CartesianGrid stroke="var(--line)" horizontal={false} /><XAxis type="number" domain={[0, 100]} /><YAxis type="category" dataKey="department" width={110} /><Tooltip />
                  <Bar dataKey="averageScore" name="Average score" fill="var(--ink)" radius={[0, 3, 3, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <Empty>No completed appraisals in this cycle.</Empty>}
          </section>
        )}

        {isLead && (
          <section className="panel">
            <h2>Top performers</h2>
            {top.length ? (
              <table><thead><tr><th>Name</th><th>Department</th><th>Score</th><th>Grade</th></tr></thead>
                <tbody>{top.map((a) => (
                  <tr key={a._id}><td>{a.employee?.name}</td><td>{a.employee?.department?.name || '—'}</td><td><strong>{a.finalScore}</strong></td><td><Badge value={a.grade} /></td></tr>
                ))}</tbody></table>
            ) : <Empty>No completed appraisals in this cycle.</Empty>}
          </section>
        )}
      </div>
    </>
  );
}
