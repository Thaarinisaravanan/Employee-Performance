import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Badge, Empty, Field, Modal, fmtDate, useCycles } from '../components/ui.jsx';

const Stars = ({ n }) => <span className="stars" aria-label={`${n} out of 5`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export default function Feedback() {
  const { user } = useAuth();
  const { cycles, cycle } = useCycles();
  const isLead = user.role !== 'employee';
  const [tab, setTab] = useState('received');
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get(`/feedback/${tab}`).then(setItems).catch((e) => setError(e.message));
  }, [tab]);
  useEffect(load, [load]);
  useEffect(() => { api.get('/users/directory').then(setPeople); }, []);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/feedback', { ...form, cycle, rating: Number(form.rating) });
      setForm(null);
      setTab('given');
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try { await api.del(`/feedback/${id}`); load(); } catch (err) { setError(err.message); }
  };

  const tabs = [['received', 'Received'], ['given', 'Given'], ...(isLead ? [['team', user.role === 'admin' ? 'Everyone' : 'My team']] : [])];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <header className="page-head">
        <div><h1>Feedback</h1><p className="muted">Recognise good work and share suggestions with colleagues.</p></div>
        <button className="btn primary" onClick={() => setForm({ to: '', rating: 4, type: isLead ? 'manager' : 'peer', message: '', anonymous: false })}>Give feedback</button>
      </header>
      <Alert>{error}</Alert>

      <div className="tabs" role="tablist">
        {tabs.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>)}
      </div>

      <section className="panel">
        {items.length === 0 ? <Empty>{tab === 'received' ? 'No feedback received yet.' : 'Nothing here yet.'}</Empty> : (
          <ul className="feed">
            {items.map((f) => (
              <li key={f._id}>
                <div className="feed-head">
                  <strong>{tab === 'given' ? `To ${f.to?.name}` : `${f.from?.name || 'Unknown'}${tab === 'team' ? ` → ${f.to?.name}` : ''}`}</strong>
                  <Badge value="neutral">{f.type}</Badge>
                  <Stars n={f.rating} />
                  <span className="muted small">{fmtDate(f.createdAt)}{f.cycle ? ` · ${f.cycle.title}` : ''}</span>
                  {(tab === 'given' || user.role === 'admin') && <button className="btn ghost danger" onClick={() => remove(f._id)}>Delete</button>}
                </div>
                <p>{f.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {form && (
        <Modal title="Give feedback" onClose={() => setForm(null)}>
          <form className="form" onSubmit={send}>
            <Field label="Who is it for?">
              <select value={form.to} onChange={set('to')} required>
                <option value="">Select a colleague</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.role})</option>)}
              </select>
            </Field>
            <div className="row">
              <Field label="Type">
                <select value={form.type} onChange={set('type')}>
                  <option value="peer">Peer</option><option value="manager">From manager</option><option value="upward">To my manager</option>
                </select>
              </Field>
              <Field label="Rating">
                <select value={form.rating} onChange={set('rating')}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} – {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][n]}</option>)}</select>
              </Field>
            </div>
            <Field label="Your feedback"><textarea rows="4" value={form.message} onChange={set('message')} required /></Field>
            <label className="check"><input type="checkbox" checked={form.anonymous} onChange={set('anonymous')} /> Send anonymously (admins can still see who sent it)</label>
            <button className="btn primary">Send feedback</button>
          </form>
        </Modal>
      )}
    </>
  );
}
