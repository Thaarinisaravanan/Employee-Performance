import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Badge, CycleSelect, Empty, Modal, ScoreRing, useCycles } from '../components/ui.jsx';

function RatingInput({ criteria, value, onChange, disabled }) {
  return (
    <div className="rating-row">
      <span>{criteria}</span>
      <div className="rating-buttons" role="radiogroup" aria-label={criteria}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={value === n} disabled={disabled}
            className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function RatingsView({ ratings }) {
  if (!ratings?.length) return <p className="muted">Not submitted yet.</p>;
  return <ul className="plain">{ratings.map((r) => <li key={r.criteria}><span>{r.criteria}</span><strong>{r.score}/5</strong></li>)}</ul>;
}

function Detail({ id, criteria, onClose, onChanged }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selfForm, setSelfForm] = useState({ ratings: {}, comments: '' });
  const [mgrForm, setMgrForm] = useState({ ratings: {}, comments: '' });

  useEffect(() => { api.get(`/appraisals/${id}`).then(setData).catch((e) => setError(e.message)); }, [id]);
  if (!data) return <Modal title="Appraisal" onClose={onClose}><Alert>{error}</Alert>{!error && <p>Loading…</p>}</Modal>;

  const { appraisal: a, goals } = data;
  const active = a.cycle.status === 'active';
  const isEmployee = a.employee._id === user._id;
  const isReviewer = (a.reviewer._id === user._id || user.role === 'admin') && !isEmployee;
  const canSelf = isEmployee && active && a.status !== 'completed';
  const canReview = isReviewer && active && a.status !== 'completed';

  const toPayload = (form) => criteria.map((c) => ({ criteria: c, score: form.ratings[c] }));
  const complete = (form) => criteria.every((c) => form.ratings[c]);

  const submit = async (kind, form) => {
    setError('');
    try {
      await api.put(`/appraisals/${a._id}/${kind}`, { ratings: toPayload(form), comments: form.comments });
      onChanged();
      onClose();
    } catch (err) { setError(err.message); }
  };

  return (
    <Modal title={`${a.employee.name} · ${a.cycle.title}`} onClose={onClose} wide>
      <Alert>{error}</Alert>
      {a.status === 'completed' && (
        <div className="result"><ScoreRing score={a.finalScore} grade={a.grade} size={130} />
          <p className="muted">Goals {a.goalScore} (50%) · Manager rating (30%) · Self rating (20%)</p></div>
      )}

      <h4>Goals this cycle</h4>
      {goals.length ? <ul className="plain">{goals.map((g) => <li key={g._id}><span>{g.title} <small className="muted">({g.weight}%)</small></span><strong>{g.progress}%</strong></li>)}</ul> : <p className="muted">No goals were set for this cycle.</p>}

      <div className="grid-2">
        <div>
          <h4>Self-assessment</h4>
          {canSelf ? (
            <>
              {criteria.map((c) => <RatingInput key={c} criteria={c} value={selfForm.ratings[c]} onChange={(n) => setSelfForm({ ...selfForm, ratings: { ...selfForm.ratings, [c]: n } })} />)}
              <textarea rows="3" placeholder="What went well? What could be better?" value={selfForm.comments} onChange={(e) => setSelfForm({ ...selfForm, comments: e.target.value })} />
              <button className="btn primary" disabled={!complete(selfForm)} onClick={() => submit('self', selfForm)}>Submit self-assessment</button>
            </>
          ) : (<><RatingsView ratings={a.selfRatings} />{a.selfComments && <p className="quote">{a.selfComments}</p>}</>)}
        </div>
        <div>
          <h4>Manager review {a.reviewer?.name && <small className="muted">by {a.reviewer.name}</small>}</h4>
          {canReview ? (
            <>
              {a.status === 'pending' && <p className="muted small">The employee has not submitted a self-assessment yet. You can still complete the review.</p>}
              {criteria.map((c) => <RatingInput key={c} criteria={c} value={mgrForm.ratings[c]} onChange={(n) => setMgrForm({ ...mgrForm, ratings: { ...mgrForm.ratings, [c]: n } })} />)}
              <textarea rows="3" placeholder="Feedback and development areas" value={mgrForm.comments} onChange={(e) => setMgrForm({ ...mgrForm, comments: e.target.value })} />
              <button className="btn primary" disabled={!complete(mgrForm)} onClick={() => submit('review', mgrForm)}>Complete review</button>
            </>
          ) : (<><RatingsView ratings={a.managerRatings} />{a.managerComments && <p className="quote">{a.managerComments}</p>}</>)}
        </div>
      </div>
    </Modal>
  );
}

export default function Appraisals() {
  const { user } = useAuth();
  const { cycles, cycle, setCycle } = useCycles();
  const [list, setList] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (cycle) api.get(`/appraisals?cycle=${cycle}`).then(setList).catch((e) => setError(e.message));
  }, [cycle]);
  useEffect(load, [load]);
  useEffect(() => { api.get('/appraisals/criteria').then(setCriteria); }, []);

  const generate = async () => {
    setError(''); setMsg('');
    try { const r = await api.post('/appraisals/generate', { cycle }); setMsg(r.message); load(); } catch (e) { setError(e.message); }
  };

  const actionLabel = (a) => {
    if (a.status === 'completed') return 'View';
    if (a.employee._id === user._id) return a.status === 'pending' ? 'Self-assess' : 'View';
    return 'Review';
  };

  return (
    <>
      <header className="page-head">
        <div><h1>Appraisals</h1><p className="muted">Self-assess, review your team, and see final scores.</p></div>
        <div className="row">
          <CycleSelect cycles={cycles} value={cycle} onChange={setCycle} />
          {user.role === 'admin' && <button className="btn" onClick={generate}>Create appraisals for this cycle</button>}
        </div>
      </header>
      <Alert>{error}</Alert>
      {msg && <div className="notice">{msg}</div>}

      <section className="panel">
        {list.length === 0 ? <Empty>No appraisals for this cycle. {user.role === 'admin' ? 'Use “Create appraisals for this cycle”.' : 'Your admin will open appraisals soon.'}</Empty> : (
          <table>
            <thead><tr><th>Employee</th><th>Reviewer</th><th>Status</th><th>Score</th><th>Grade</th><th /></tr></thead>
            <tbody>{list.map((a) => (
              <tr key={a._id}>
                <td><strong>{a.employee.name}</strong><div className="muted small">{a.employee.designation}</div></td>
                <td>{a.reviewer.name}</td>
                <td><Badge value={a.status} /></td>
                <td>{a.status === 'completed' ? <strong>{a.finalScore}</strong> : '—'}</td>
                <td>{a.grade ? <Badge value={a.grade} /> : '—'}</td>
                <td className="actions"><button className="btn ghost" onClick={() => setOpenId(a._id)}>{actionLabel(a)}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
      {openId && <Detail id={openId} criteria={criteria} onClose={() => setOpenId(null)} onChanged={load} />}
    </>
  );
}
