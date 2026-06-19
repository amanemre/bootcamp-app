import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  'in_progress': { background: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  'completed':   { background: '#dcfce7', color: '#16a34a', label: 'Completed' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { background: '#f3f4f6', color: '#4b5563', label: status };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

function CountPill({ count, color }) {
  if (!count) return <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>—</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color }}>{count}</span>;
}

import { formatDate } from '../utils/datetime';

export default function TestRuns() {
  const navigate = useNavigate();
  const [runs,       setRuns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');

  async function fetchRuns() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch('/api/runs');
      const json = await res.json();
      if (json.success) setRuns(json.data.items);
      else setFetchError(json.error || 'Failed to load runs.');
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Test Runs</h1>
      </div>

      {fetchError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{fetchError}</span>
          <button onClick={fetchRuns} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
        </div>
      )}

      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
        <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Suite</th>
              <th style={th}>Feature</th>
              <th style={{ ...th, width: 120 }}>Status</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: 'var(--status-pass)' }}>Pass</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: 'var(--status-fail)' }}>Fail</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: 'var(--status-skip)' }}>Skip</th>
              <th style={{ ...th, width: 120 }}>Started</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</td></tr>}
            {!loading && runs.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
                No test runs yet. Start one from a suite's detail page.
              </td></tr>
            )}
            {!loading && runs.map((run, i) => (
              <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)}
                style={{ background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 ? 'var(--surface-alt)' : 'var(--surface)'}
              >
                <td style={{ ...td, fontWeight: 500 }}>{run.suite_name ?? '—'}</td>
                <td style={{ ...td, color: 'var(--text-muted)' }}>{run.feature ?? '—'}</td>
                <td style={td}><StatusBadge status={run.status} /></td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={run.pass_count} color="var(--status-pass)" /></td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={run.fail_count} color="var(--status-fail)" /></td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={run.skip_count} color="var(--status-skip)" /></td>
                <td style={{ ...td, color: 'var(--text-faint)', fontSize: 13 }}>{formatDate(run.start_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--canvas-muted)' }}>
        {runs.length} run{runs.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' };
const td = { padding: '12px 16px', verticalAlign: 'middle' };
