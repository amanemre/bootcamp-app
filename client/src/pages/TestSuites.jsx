import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import SuiteModal from '../components/SuiteModal';

const STATUS_STYLES = {
  Draft:          { background: '#f3f4f6', color: '#4b5563' },
  Ready:          { background: '#dbeafe', color: '#1d4ed8' },
  'In Progress':  { background: '#fef9c3', color: '#854d0e' },
  Passed:         { background: '#dcfce7', color: '#16a34a' },
  Failed:         { background: '#fee2e2', color: '#dc2626' },
};

function Badge({ value }) {
  const s = STATUS_STYLES[value] ?? { background: '#f3f4f6', color: '#4b5563' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>
      {value}
    </span>
  );
}

import { formatDateTime as formatDate } from '../utils/datetime';

export default function TestSuites() {
  const navigate = useNavigate();
  const [suites, setSuites]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen]     = useState(false);

  async function fetchSuites() {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res  = await fetch(`/api/suites?${params}`);
      const json = await res.json();
      if (json.success) setSuites(json.data.items);
      else setFetchError(json.error || 'Failed to load suites.');
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchSuites(); }, [statusFilter]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Test Suites</h1>
        <button
          onClick={() => setModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={15} /> New Suite
        </button>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)' }}
        >
          <option value="">All Statuses</option>
          {['Draft', 'Ready', 'In Progress', 'Passed', 'Failed'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {fetchError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{fetchError}</span>
          <button onClick={fetchSuites} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Name</th>
              <th style={{ ...th, width: 200 }}>Feature</th>
              <th style={{ ...th, width: 120 }}>Status</th>
              <th style={{ ...th, width: 80, textAlign: 'center' }}>Cases</th>
              <th style={{ ...th, width: 195 }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</td></tr>
            )}
            {!loading && suites.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>No test suites found.</td></tr>
            )}
            {!loading && suites.map((suite, i) => (
              <tr
                key={suite.id}
                onClick={() => navigate(`/test-suites/${suite.id}`)}
                style={{ background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
              >
                <td style={{ ...td, fontWeight: 500 }}>{suite.name}</td>
                <td style={{ ...td, color: 'var(--text-muted)' }}>{suite.feature}</td>
                <td style={td}><Badge value={suite.status} /></td>
                <td style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>{suite.case_count}</td>
                <td style={{ ...td, color: 'var(--text-faint)', fontSize: 13 }}>{formatDate(suite.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: 'var(--canvas-muted)' }}>
        {suites.length} suite{suites.length !== 1 ? 's' : ''}
      </div>

      {modalOpen && (
        <SuiteModal
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchSuites(); }}
        />
      )}
    </div>
  );
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' };
const td = { padding: '12px 16px', verticalAlign: 'middle' };
