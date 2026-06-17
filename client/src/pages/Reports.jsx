import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CountPill({ count, color }) {
  if (!count) return <span style={{ fontSize: 13, color: '#d1d5db' }}>—</span>;
  return <span style={{ fontSize: 13, fontWeight: 600, color }}>{count}</span>;
}

export default function Reports() {
  const navigate = useNavigate();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState('');

  async function fetchReports() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch('/api/reports');
      const json = await res.json();
      if (json.success) setReports(json.data.items);
      else setFetchError(json.error || 'Failed to load reports.');
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reports</h1>
      </div>

      {fetchError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{fetchError}</span>
          <button onClick={fetchReports} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
        </div>
      )}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ ...th, width: 70 }}>Report</th>
              <th style={th}>Suite</th>
              <th style={{ ...th, width: 120 }}>Run Date</th>
              <th style={{ ...th, width: 120 }}>Generated</th>
              <th style={{ ...th, width: 60, textAlign: 'center' }}>Total</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#16a34a' }}>Pass</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#dc2626' }}>Fail</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#7e22ce' }}>Skip</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && reports.length === 0 && !fetchError && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                No reports yet. Open a completed test run and click “Generate report” to create one.
              </td></tr>
            )}
            {!loading && reports.map((rep, i) => (
              <tr key={rep.id} onClick={() => navigate(`/reports/${rep.id}`)}
                style={{ background: i % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#fafafa' : '#fff'}
              >
                <td style={{ ...td, fontWeight: 600, color: '#2563eb' }}>#{rep.id}</td>
                <td style={{ ...td, fontWeight: 500 }}>{rep.suite_name || '—'}</td>
                <td style={{ ...td, color: '#6b7280', fontSize: 13 }}>{formatDate(rep.run_date)}</td>
                <td style={{ ...td, color: '#9ca3af', fontSize: 13 }}>{formatDate(rep.generated_at)}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{rep.total_count}</td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={rep.passed_count} color="#16a34a" /></td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={rep.failed_count} color="#dc2626" /></td>
                <td style={{ ...td, textAlign: 'center' }}><CountPill count={rep.skipped_count} color="#7e22ce" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
        {reports.length} report{reports.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#374151' };
const td = { padding: '12px 16px', verticalAlign: 'middle' };
