import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Badge, CycleSelect, Empty, Field, Modal, fmtDate, toInputDate, useCycles } from '../components/ui.jsx';

const blank = { title: '', description: '', target: '', weight: 20, dueDate: '', employee: '' };

export default function Goals() {
  const { user } = useAuth();
  const { cycles, cycle, setCycle } = useCycles();
  const [goals, setGoals] = useState([]);
  const [team, setTeam] = useState([]);
  const [editing, setEditing] = useState(null); // null | goal object (with _id) | blank form
  const [error, setError] = useState('');
  const canManage = user.role !== 'employee';

  const load = useCallback(() => {
    if (cycle) api.get(`/goals?cycle=${cycle}`).then(setGoals).catch((e) => setError(e.message));
  }, [cycle]);
  useEffect(load, [load]);
  useEffect(() => { if (canManage) api.get('/users/team').then(setTeam); }, [canManage]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { ...editing, cycle, employee: editing.employee || user._id };
      if (editing._id) await api.put(`/goals/${editing._id}`, body);
      else await api.post('/goals', body);
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const setProgress = async (g, progress) => {
    try {
      await api.put(`/goals/${g._id}`, { progress });
      setGoals((list) => list.map((x) => (x._id === g._id ? { ...x, progress, status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started' } : x)));
    } catch (err) { setError(err.message); }
  };

  const remove = async (g) => {
    if (!window.confirm(`Delete "${g.title}"?`)) return;
    try { await api.del(`/goals/${g._id}`); load(); } catch (err) { setError(err.message); }
  };

  // Group by employee so managers see one block per person
  const groups = goals.reduce((acc, g) => {
    const key = g.employee?._id;
    (acc[key] = acc[key] || { name: g.employee?.name, items: [] }).items.push(g);
    return acc;
  }, {});
  const cycleClosed = cycles.find((c) => c._id === cycle)?.status === 'closed';

  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  return (
    <>
      <header className="page-head">
        <div><h1>Goals</h1><p className="muted">{canManage ? 'Set and track goals for your team.' : 'Track your goals and keep progress up to date.'}</p></div>
        <div className="row">
          <CycleSelect cycles={cycles} value={cycle} onChange={setCycle} />
          {!cycleClosed && <button className="btn primary" onClick={() => setEditing({ ...blank })}>Add goal</button>}
        </div>
      </header>
      <Alert>{error}</Alert>

      {Object.keys(groups).length === 0 && <Empty>No goals in this cycle yet. Add one to get started.</Empty>}
      {Object.entries(groups).map(([id, group]) => {
        const totalWeight = group.items.reduce((s, g) => s + g.weight, 0);
        return (
          <section className="panel" key={id}>
            <div className="panel-head"><h2>{group.name}</h2><span className={totalWeight === 100 ? 'muted' : 'warn-text'}>Total weight {totalWeight}%{totalWeight !== 100 && ' (aim for 100%)'}</span></div>
            <table>
              <thead><tr><th>Goal</th><th>Weight</th><th>Due</th><th style={{ width: '28%' }}>Progress</th><th>Status</th><th /></tr></thead>
              <tbody>
                {group.items.map((g) => {
                  const mine = String(g.employee?._id) === String(user._id);
                  return (
                    <tr key={g._id}>
                      <td><strong>{g.title}</strong>{g.target && <div className="muted small">Target: {g.target}</div>}</td>
                      <td>{g.weight}%</td>
                      <td>{fmtDate(g.dueDate)}</td>
                      <td>
                        <div className="progress-row">
                          <input type="range" min="0" max="100" step="5" value={g.progress} disabled={cycleClosed || !(mine || canManage)}
                            onChange={(e) => setProgress(g, Number(e.target.value))} aria-label={`Progress for ${g.title}`} />
                          <span>{g.progress}%</span>
                        </div>
                      </td>
                      <td><Badge value={g.status} /></td>
                      <td className="actions">
                        {canManage && !cycleClosed && <button className="btn ghost" onClick={() => setEditing({ ...g, employee: g.employee._id, dueDate: toInputDate(g.dueDate) })}>Edit</button>}
                        {canManage && !cycleClosed && <button className="btn ghost danger" onClick={() => remove(g)}>Delete</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}

      {editing && (
        <Modal title={editing._id ? 'Edit goal' : 'Add goal'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="form">
            {canManage && !editing._id && (
              <Field label="Assign to">
                <select value={editing.employee} onChange={set('employee')} required>
                  <option value="">Select a person</option>
                  {team.map((t) => <option key={t._id} value={t._id}>{t.name}{t._id === user._id ? ' (me)' : ''}</option>)}
                </select>
              </Field>
            )}
            <Field label="Goal title"><input value={editing.title} onChange={set('title')} required /></Field>
            <Field label="Description"><textarea rows="2" value={editing.description || ''} onChange={set('description')} /></Field>
            <Field label="Target (how will success be measured?)"><input value={editing.target || ''} onChange={set('target')} /></Field>
            <div className="row">
              <Field label="Weight (%)"><input type="number" min="1" max="100" value={editing.weight} onChange={set('weight')} required /></Field>
              <Field label="Due date"><input type="date" value={editing.dueDate || ''} onChange={set('dueDate')} /></Field>
            </div>
            <button className="btn primary">Save goal</button>
          </form>
        </Modal>
      )}
    </>
  );
}
