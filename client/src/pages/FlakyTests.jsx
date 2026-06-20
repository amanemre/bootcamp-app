import { useState, useEffect } from 'react';
import { formatDateTime } from '../utils/datetime';

const FLAKY_STYLES = {
  Flaky:    { background: '#fee2e2', color: '#dc2626' },
  Unstable: { background: '#fef9c3', color: '#92400e' },
  Stable:   { background: '#dcfce7', color: '#16a34a' },
};

const RANK_COLORS = ['#f59e0b', '#9ca3af', '#b45309'];

const th = {
  padding: '10px 14px', textAlign: 'left', fontWeight: 600,
  fontSize: 13, color: 'var(--text-faint)', whiteSpace: 'nowrap',
};
const td = {
  padding: '10px 14px', fontSize: 14, verticalAlign: 'top',
};

function FlakinessBadge({ label }) {
  const s = FLAKY_STYLES[label] ?? FLAKY_STYLES.Stable;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: s.background, color: s.color, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function Sparkline({ history }) {
  const dots = [...history].reverse().slice(0, 10);
  while (dots.length < 10) dots.push(null);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {dots.map((r, i) => (
        <span key={i} style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: r === 'passed' ? '#16a34a' : r === 'failed' ? '#dc2626' : '#d1d5db',
        }} title={r ?? 'no data'} />
      ))}
    </div>
  );
}

function TrendIcon({ trend }) {
  if (trend === 'improving') return <span style={{ color: '#16a34a', fontWeight: 700 }}>↑</span>;
  if (trend === 'degrading') return <span style={{ color: '#dc2626', fontWeight: 700 }}>↓</span>;
  return <span style={{ color: '#9ca3af' }}>→</span>;
}

function RankCircle({ rank }) {
  const color = RANK_COLORS[rank - 1] ?? '#6b7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: '50%',
      background: color, color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0,
    }}>
      {rank}
    </span>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 18px', borderRadius: 6, cursor: 'pointer',
      fontWeight: active ? 600 : 500, fontSize: 14,
      background: active ? '#2563eb' : 'transparent',
      color: active ? '#fff' : 'var(--text-faint)',
      border: active ? 'none' : '1px solid var(--border)',
    }}>
      {label}
    </button>
  );
}

function LeaderboardTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
        No flaky tests detected yet. Run more test cycles to build history.
      </div>
    );
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ ...th, width: 48 }}>#</th>
              <th style={th}>Test Name</th>
              <th style={{ ...th, width: 70, textAlign: 'center' }}>Runs</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#16a34a' }}>Pass</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#dc2626' }}>Fail</th>
              <th style={{ ...th, width: 90, textAlign: 'right' }}>Pass Rate</th>
              <th style={{ ...th, width: 100 }}>Flakiness</th>
              <th style={th}>Hypothesis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.test_case_id} style={{
                background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <td style={{ ...td, textAlign: 'center' }}><RankCircle rank={row.rank} /></td>
                <td style={{ ...td, fontWeight: 500 }}>{row.title}</td>
                <td style={{ ...td, textAlign: 'center', color: 'var(--text-faint)' }}>{row.decisive}</td>
                <td style={{ ...td, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{row.passed}</td>
                <td style={{ ...td, textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{row.failed}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                  {row.pass_rate !== null ? `${row.pass_rate}%` : '—'}
                </td>
                <td style={td}><FlakinessBadge label={row.flakiness_label} /></td>
                <td style={{ ...td, color: 'var(--text-faint)', fontSize: 13, maxWidth: 340 }}>
                  <span style={{
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {row.ai_hypothesis || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-faint)', fontSize: 14 }}>
        No test history yet.
      </div>
    );
  }
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
      <div className="table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
              <th style={th}>Test Name</th>
              <th style={{ ...th, width: 70, textAlign: 'center' }}>Runs</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#16a34a' }}>Pass</th>
              <th style={{ ...th, width: 60, textAlign: 'center', color: '#dc2626' }}>Fail</th>
              <th style={{ ...th, width: 90, textAlign: 'right' }}>Pass Rate</th>
              <th style={{ ...th, width: 100 }}>Flakiness</th>
              <th style={{ ...th, width: 130 }}>Last 10</th>
              <th style={{ ...th, width: 60, textAlign: 'center' }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.test_case_id} style={{
                background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                <td style={{ ...td, fontWeight: 500 }}>{row.title}</td>
                <td style={{ ...td, textAlign: 'center', color: 'var(--text-faint)' }}>{row.total_runs}</td>
                <td style={{ ...td, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{row.passed}</td>
                <td style={{ ...td, textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>{row.failed}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>
                  {row.pass_rate !== null ? `${row.pass_rate}%` : '—'}
                </td>
                <td style={td}><FlakinessBadge label={row.flakiness_label} /></td>
                <td style={td}><Sparkline history={row.history} /></td>
                <td style={{ ...td, textAlign: 'center', fontSize: 18 }}><TrendIcon trend={row.trend} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FlakyTests() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [allTests,    setAllTests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState('');
  const [updatedAt,   setUpdatedAt]   = useState('');
  const [activeTab,   setActiveTab]   = useState('leaderboard');
  const [refreshing,  setRefreshing]  = useState(false);

  async function fetchData() {
    setLoading(true);
    setFetchError('');
    try {
      const res  = await fetch('/api/flaky-tests');
      const json = await res.json();
      if (json.success) {
        setLeaderboard(json.data.leaderboard);
        setAllTests(json.data.all_tests);
        setUpdatedAt(json.data.updated_at ?? '');
      } else {
        setFetchError(json.error || 'Failed to load flaky tests.');
      }
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch('/api/flaky-tests/refresh', { method: 'POST' });
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <main style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Flaky Test Tracker</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          style={{
            padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
            fontWeight: 500, background: '#2563eb', color: '#fff', border: 'none',
            opacity: refreshing || loading ? 0.6 : 1,
          }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh Stats'}
        </button>
      </div>
      {updatedAt && (
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-faint)' }}>
          Last updated: {formatDateTime(updatedAt)}
        </p>
      )}

      {fetchError && (
        <div style={{
          background: '#fee2e2', color: '#dc2626', padding: '12px 16px',
          borderRadius: 6, marginBottom: 16, fontSize: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{fetchError}</span>
          <button onClick={fetchData} style={{
            background: 'none', border: '1px solid #dc2626', borderRadius: 4,
            color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13,
          }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <TabButton label="Top 10 Flakiest" active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} />
        <TabButton label="Full History"    active={activeTab === 'history'}     onClick={() => setActiveTab('history')} />
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</div>
      ) : activeTab === 'leaderboard' ? (
        <LeaderboardTable rows={leaderboard} />
      ) : (
        <HistoryTable rows={allTests} />
      )}
    </main>
  );
}
