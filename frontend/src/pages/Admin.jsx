import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Badge, Empty, Field, Modal, fmtDate, toInputDate } from '../components/ui.jsx';

/* ---------------- Users ---------------- */
const blankUser = { name: '', email: '', password: '', role: 'employee', department: '', manager: '', designation: '', joinDate: '', active: true };

function Users() {
  const [users, setUsers] = useState([]);
  const [depts, setDepts] = useState([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams({ ...(search && { search }), ...(role && { role }) });
    api.get(`/admin/users?${q}`).then(setUsers).catch((e) => setError(e.message));
  }, [search, role]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get('/admin/departments').then(setDepts); }, []);

  const managers = users.filter((u) => u.role !== 'employee' && u._id !== form?._id);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form._id) await api.put(`/admin/users/${form._id}`, form);
      else await api.post('/admin/users', form);
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their goals and appraisals will remain but they can no longer log in.`)) return;
    try { await api.del(`/admin/users/${u._id}`); load(); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="row space">
        <div className="row">
          <input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            <option value="">All roles</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="employee">Employee</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => setForm({ ...blankUser })}>Add employee</button>
      </div>
      <Alert>{error}</Alert>
      <section className="panel">
        {users.length === 0 ? <Empty>No users match.</Empty> : (
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Manager</th><th>Joined</th><th>Status</th><th /></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u._id}>
                <td><strong>{u.name}</strong><div className="muted small">{u.email}</div></td>
                <td>{u.role}</td><td>{u.department?.name || '—'}</td><td>{u.manager?.name || '—'}</td><td>{fmtDate(u.joinDate)}</td>
                <td><Badge value={u.active ? 'active' : 'closed'}>{u.active ? 'active' : 'inactive'}</Badge></td>
                <td className="actions">
                  <button className="btn ghost" onClick={() => setForm({ ...u, password: '', department: u.department?._id || '', manager: u.manager?._id || '', joinDate: toInputDate(u.joinDate) })}>Edit</button>
                  <button className="btn ghost danger" onClick={() => remove(u)}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>

      {form && (
        <Modal title={form._id ? 'Edit user' : 'Add employee'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <div className="row"><Field label="Full name"><input value={form.name} onChange={set('name')} required /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required /></Field></div>
            <div className="row">
              <Field label={form._id ? 'New password (optional)' : 'Password (default Password@123)'}><input type="password" value={form.password} onChange={set('password')} minLength={form.password ? 6 : undefined} /></Field>
              <Field label="Role"><select value={form.role} onChange={set('role')}><option value="employee">Employee</option><option value="manager">Manager</option><option value="admin">Admin</option></select></Field>
            </div>
            <div className="row">
              <Field label="Department"><select value={form.department} onChange={set('department')}><option value="">None</option>{depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
              <Field label="Reports to"><select value={form.manager} onChange={set('manager')}><option value="">No manager</option>{managers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}</select></Field>
            </div>
            <div className="row"><Field label="Designation"><input value={form.designation || ''} onChange={set('designation')} /></Field>
              <Field label="Join date"><input type="date" value={form.joinDate} onChange={set('joinDate')} /></Field></div>
            {form._id && <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Account is active</label>}
            <button className="btn primary">Save</button>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ---------------- Departments ---------------- */
function Departments() {
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const load = () => api.get('/admin/departments').then(setList);
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try { await api.post('/admin/departments', { name }); setName(''); load(); } catch (err) { setError(err.message); }
  };
  const rename = async (d) => {
    const n = window.prompt('Rename department', d.name);
    if (!n || n === d.name) return;
    try { await api.put(`/admin/departments/${d._id}`, { name: n }); load(); } catch (err) { setError(err.message); }
  };
  const remove = async (d) => {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    try { await api.del(`/admin/departments/${d._id}`); load(); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <form className="row" onSubmit={add}><input placeholder="New department name" value={name} onChange={(e) => setName(e.target.value)} required /><button className="btn primary">Add department</button></form>
      <Alert>{error}</Alert>
      <section className="panel">
        {list.length === 0 ? <Empty>No departments yet.</Empty> : (
          <table><tbody>{list.map((d) => (
            <tr key={d._id}><td><strong>{d.name}</strong></td><td className="actions"><button className="btn ghost" onClick={() => rename(d)}>Rename</button><button className="btn ghost danger" onClick={() => remove(d)}>Delete</button></td></tr>
          ))}</tbody></table>
        )}
      </section>
    </>
  );
}

/* ---------------- Evaluation cycles ---------------- */
function Cycles() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/admin/cycles').then(setList);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form._id) await api.put(`/admin/cycles/${form._id}`, form);
      else await api.post('/admin/cycles', form);
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  };
  const setStatus = async (c, status) => {
    try { await api.put(`/admin/cycles/${c._id}`, { status }); load(); } catch (err) { setError(err.message); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete cycle ${c.title}?`)) return;
    try { await api.del(`/admin/cycles/${c._id}`); load(); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="row space"><p className="muted">Goals and appraisals can only be changed while a cycle is active. Closing a cycle locks its results.</p>
        <button className="btn primary" onClick={() => setForm({ title: '', startDate: '', endDate: '', status: 'draft' })}>New cycle</button></div>
      <Alert>{error}</Alert>
      <section className="panel">
        {list.length === 0 ? <Empty>No evaluation cycles yet. Create one to start collecting goals.</Empty> : (
          <table>
            <thead><tr><th>Cycle</th><th>Period</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c._id}>
                <td><strong>{c.title}</strong></td><td>{fmtDate(c.startDate)} to {fmtDate(c.endDate)}</td><td><Badge value={c.status} /></td>
                <td className="actions">
                  {c.status === 'draft' && <button className="btn ghost" onClick={() => setStatus(c, 'active')}>Activate</button>}
                  {c.status === 'active' && <button className="btn ghost" onClick={() => setStatus(c, 'closed')}>Close</button>}
                  {c.status === 'closed' && <button className="btn ghost" onClick={() => setStatus(c, 'active')}>Reopen</button>}
                  <button className="btn ghost" onClick={() => setForm({ ...c, startDate: toInputDate(c.startDate), endDate: toInputDate(c.endDate) })}>Edit</button>
                  <button className="btn ghost danger" onClick={() => remove(c)}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {form && (
        <Modal title={form._id ? 'Edit cycle' : 'New cycle'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <Field label="Title (e.g. 2026 Q3)"><input value={form.title} onChange={set('title')} required /></Field>
            <div className="row"><Field label="Start date"><input type="date" value={form.startDate} onChange={set('startDate')} required /></Field>
              <Field label="End date"><input type="date" value={form.endDate} onChange={set('endDate')} required /></Field></div>
            <Field label="Status"><select value={form.status} onChange={set('status')}><option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option></select></Field>
            <button className="btn primary">Save cycle</button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('users');
  const tabs = [['users', 'Employees'], ['departments', 'Departments'], ['cycles', 'Evaluation cycles']];
  return (
    <>
      <header className="page-head"><div><h1>Administration</h1><p className="muted">Manage people, departments and review periods.</p></div></header>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'users' && <Users />}
      {tab === 'departments' && <Departments />}
      {tab === 'cycles' && <Cycles />}
    </>
  );
}
