import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import BugModal from '../components/BugModal';

const SEV_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#6b7280' },
};

const PRI_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  High:     { background: '#ffedd5', color: '#ea580c' },
  Medium:   { background: '#dbeafe', color: '#1d4ed8' },
  Low:      { background: '#f3f4f6', color: '#6b7280' },
};

const STATUS_STYLES = {
  'Open':        { background: '#dbeafe', color: '#1d4ed8' },
  'In Progress': { background: '#fef9c3', color: '#854d0e' },
  'Resolved':    { background: '#dcfce7', color: '#16a34a' },
  'Closed':      { background: '#f3f4f6', color: '#6b7280' },
  'Reopened':    { background: '#f3e8ff', color: '#7e22ce' },
};

function Badge({ value, map }) {
  const s = map[value] ?? { background: '#f3f4f6', color: '#374151' };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{value}</span>;
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Bugs() {
  const navigate = useNavigate();
  const [bugs,         setBugs]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sevFilter,    setSevFilter]    = useState('');
  const [search,       setSearch]       = useState('');
  const [debouncedQ,   setDebouncedQ]   = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(search), 300);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  async function fetchBugs() {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sevFilter)    params.set('severity', sevFilter);
      if (debouncedQ)   params.set('search', debouncedQ);
      const res  = await fetch(`/api/bugs?${params}`);
      const json = await res.json();
      if (json.success) setBugs(json.data.items);
      else setFetchError(json.error || 'Failed to load bugs.');
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBugs(); }, [statusFilter, sevFilter, debouncedQ]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Bugs</h1>
        <button onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Plus size={15} /> New Bug
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          <option value="">All Statuses</option>
          {['Open', 'In Progress', 'Resolved', 'Closed', 'Reopened'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={sel}>
          <option value="">All Severities</option>
          {['Critical', 'Major', 'Minor', 'Trivial'].map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or description…" style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }} />
        </div>
      </div>

      {fetchError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: 6, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{fetchError}</span>
          <button onClick={fetchBugs} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={th}>Title</th>
              <th style={{ ...th, width: 100 }}>Severity</th>
              <th style={{ ...th, width: 100 }}>Priority</th>
              <th style={{ ...th, width: 120 }}>Status</th>
              <th style={{ ...th, width: 120 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>}
            {!loading && bugs.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No bugs found.</td></tr>}
            {!loading && bugs.map((bug, i) => (
              <tr key={bug.id} onClick={() => navigate(`/bugs/${bug.id}`)}
                style={{ background: i % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 ? '#fafafa' : '#fff'}
              >
                <td style={{ ...td, fontWeight: 500, maxWidth: 400 }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bug.title}</span>
                </td>
                <td style={td}><Badge value={bug.severity} map={SEV_STYLES} /></td>
                <td style={td}><Badge value={bug.priority} map={PRI_STYLES} /></td>
                <td style={td}><Badge value={bug.status}   map={STATUS_STYLES} /></td>
                <td style={{ ...td, color: '#9ca3af', fontSize: 13 }}>{formatDate(bug.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
        {bugs.length} bug{bugs.length !== 1 ? 's' : ''}
      </div>

      {modalOpen && (
        <BugModal
          onClose={() => setModalOpen(false)}
          onSaved={bug => { setModalOpen(false); navigate(`/bugs/${bug.id}`); }}
        />
      )}
    </div>
  );
}

const sel = { padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' };
const th  = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#374151' };
const td  = { padding: '12px 16px', verticalAlign: 'middle' };
