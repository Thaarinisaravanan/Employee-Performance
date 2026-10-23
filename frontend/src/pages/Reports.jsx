import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Badge, CycleSelect, Empty, downloadCSV, useCycles } from '../components/ui.jsx';

export default function Reports() {
  const { cycles, cycle, setCycle } = useCycles();
  const [rows, setRows] = useState([]);
  const [dept, setDept] = useState('');

  useEffect(() => { if (cycles.length) api.get(`/analytics/report?cycle=${cycle}`).then(setRows); }, [cycle, cycles.length]);

  const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))];
  const shown = dept ? rows.filter((r) => r.department === dept) : rows;
  const cycleTitle = cycles.find((c) => c._id === cycle)?.title || 'all-cycles';

  return (
    <>
      <header className="page-head">
        <div><h1>Reports</h1><p className="muted">Performance results you can export or print.</p></div>
        <div className="row no-print">
          <CycleSelect cycles={cycles} value={cycle} onChange={setCycle} allowAll />
          <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">
            <option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}
          </select>
          <button className="btn" onClick={() => downloadCSV(`performance-${cycleTitle}.csv`, shown)} disabled={!shown.length}>Export CSV</button>
          <button className="btn" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
      </header>
      <section className="panel">
        {shown.length === 0 ? <Empty>No appraisal data for this selection.</Empty> : (
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Reviewer</th><th>Cycle</th><th>Goal score</th><th>Final score</th><th>Grade</th><th>Status</th></tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.employee}</strong><div className="muted small">{r.designation}</div></td>
                <td>{r.department || '—'}</td><td>{r.reviewer}</td><td>{r.cycle}</td>
                <td>{r.status === 'completed' ? r.goalScore : '—'}</td>
                <td>{r.status === 'completed' ? <strong>{r.finalScore}</strong> : '—'}</td>
                <td>{r.grade ? <Badge value={r.grade} /> : '—'}</td>
                <td><Badge value={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </>
  );
}
