import { useEffect, useState } from 'react';
import { api } from '../api.js';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const TONES = {
  active: 'ok', completed: 'ok', Outstanding: 'ok', 'Exceeds Expectations': 'ok',
  pending: 'warn', draft: 'warn', in_progress: 'warn', self_submitted: 'warn', 'Meets Expectations': 'neutral',
  closed: 'neutral', not_started: 'neutral', 'Needs Improvement': 'bad',
};
export const Badge = ({ value, children }) => (
  <span className={`badge ${TONES[value] || 'neutral'}`}>{children || String(value).replace('_', ' ')}</span>
);

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (
  <label className="field"><span>{label}</span>{children}</label>
);

export const Alert = ({ children }) => (children ? <div className="alert" role="alert">{children}</div> : null);
export const Empty = ({ children }) => <div className="empty">{children}</div>;

// Loads cycles once and selects the active one by default
export function useCycles() {
  const [cycles, setCycles] = useState([]);
  const [cycle, setCycle] = useState('');
  useEffect(() => {
    api.get('/admin/cycles').then((list) => {
      setCycles(list);
      const active = list.find((c) => c.status === 'active') || list[0];
      if (active) setCycle(active._id);
    });
  }, []);
  return { cycles, cycle, setCycle };
}

export const CycleSelect = ({ cycles, value, onChange, allowAll }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Evaluation cycle">
    {allowAll && <option value="">All cycles</option>}
    {cycles.map((c) => <option key={c._id} value={c._id}>{c.title} ({c.status})</option>)}
  </select>
);

export function ScoreRing({ score = 0, grade, size = 150 }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const tone = score >= 75 ? 'var(--accent)' : score >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Score ${score} out of 100`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`} transform="rotate(-90 60 60)" />
      </svg>
      <div className="ring-text"><strong>{score}</strong>{grade && <small>{grade}</small>}</div>
    </div>
  );
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter((k) => k !== 'id');
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}
