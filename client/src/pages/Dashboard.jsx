import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PassRateTrendChart, BugsWeeklyChart, CoverageDonutChart, ChartSkeleton } from '../components/DashboardCharts';
import { formatDate } from '../utils/datetime';

const REFRESH_MS = 30000;

const RUN_STATUS = {
  in_progress: { background: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  completed:   { background: '#dcfce7', color: '#16a34a', label: 'Completed' },
};

function RunStatusBadge({ status }) {
  const s = RUN_STATUS[status] ?? { background: '#f3f4f6', color: '#4b5563', label: status };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>;
}

// "2026-06-14 15:43:42" (UTC) → relative string like "3h ago" / "just now".
function relativeTime(str) {
  if (!str) return '—';
  const then = new Date(str.replace(' ', 'T') + 'Z').getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(diff)) return '—';
  const sec = Math.round(diff / 1000);
  if (sec < 60)  return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60)  return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30)  return `${day}d ago`;
  return formatDate(str);
}

function formatDuration(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const ACTION_DOT = {
  status_change: '#2563eb',
  field_change:  '#7e22ce',
  comment:       '#16a34a',
};

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: accent ?? 'var(--text)', marginTop: 6, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Graceful empty state for a panel (table / feed) that has no rows yet.
// Looks like a designed part of the card and points to the next action.
function PanelEmpty({ title, hint }) {
  return (
    <div style={{ padding: '36px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-faint)', maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

// Animated grey block used in the loading skeleton.
function Shimmer({ width = '100%', height = 14, radius = 4, style }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)',
      backgroundSize: '400% 100%',
      animation: 'dash-shimmer 1.4s ease infinite',
      ...style,
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
            <Shimmer width={90} height={12} />
            <Shimmer width={64} height={28} style={{ marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[0, 1].map(col => (
          <div key={col} style={{ flex: 1, minWidth: 320, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
            <Shimmer width={140} height={16} style={{ marginBottom: 16 }} />
            {[0, 1, 2, 3, 4].map(r => <Shimmer key={r} height={16} style={{ marginBottom: 12 }} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [trends,  setTrends]  = useState(null);
  const [loading, setLoading] = useState(true);   // only true on the very first load
  const [error,   setError]   = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const firstLoad = useRef(true);

  async function fetchMetrics() {
    try {
      const [mRes, tRes] = await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch('/api/dashboard/trends'),
      ]);
      const mJson = await mRes.json();
      const tJson = await tRes.json();
      if (mJson.success) {
        setData(mJson.data);
        setError('');
        setUpdatedAt(new Date());
      } else {
        setError(mJson.error || 'Failed to load dashboard data.');
      }
      if (tJson.success) setTrends(tJson.data);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      if (firstLoad.current) { setLoading(false); firstLoad.current = false; }
    }
  }

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, REFRESH_MS);   // auto-refresh every 30s
    return () => clearInterval(id);
  }, []);

  const wrap = { padding: '24px 32px', maxWidth: 1100, margin: '0 auto' };

  // --- First-load skeleton ---
  if (loading) {
    return (
      <div style={wrap}>
        <style>{keyframes}</style>
        <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <LoadingSkeleton />
      </div>
    );
  }

  // --- Error state (only when we have no data to show at all) ---
  if (error && !data) {
    return (
      <div style={wrap}>
        <h1 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '16px 20px', borderRadius: 8, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={fetchMetrics} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '4px 12px', fontSize: 13 }}>Retry</button>
        </div>
      </div>
    );
  }

  const { metrics, recentRuns, recentActivity } = data;
  const isEmpty = metrics.totalTestCases === 0 && recentRuns.length === 0 && recentActivity.length === 0;

  return (
    <div style={wrap}>
      <style>{keyframes}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        {updatedAt && (
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            Updated {updatedAt.toLocaleTimeString('en-GB')} · auto-refreshes every 30s
          </span>
        )}
      </div>

      {/* A transient fetch failure while we still have older data: warn but keep showing it. */}
      {error && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: '8px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
          {error} Showing last known data.
        </div>
      )}

      {isEmpty ? (
        <div style={{ background: 'var(--surface)', border: '1px dashed #d1d5db', borderRadius: 10, padding: '48px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Nothing here yet</div>
          <div style={{ fontSize: 14, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>Add a test case, run a suite, or file a bug — your metrics and recent activity will appear here.</div>
        </div>
      ) : (
        <>
          {/* --- Metric cards --- */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
            <MetricCard
              label="Total Test Cases"
              value={metrics.totalTestCases}
              accent={metrics.totalTestCases === 0 ? '#d1d5db' : undefined}
              sub={metrics.totalTestCases === 0 ? 'Add your first one on the Test Cases page' : undefined}
            />
            <MetricCard
              label="Pass Rate"
              value={metrics.passRate == null ? '—' : `${metrics.passRate}%`}
              accent={metrics.passRate == null ? 'var(--text-faint)' : metrics.passRate >= 70 ? 'var(--status-pass)' : metrics.passRate >= 40 ? '#d97706' : 'var(--status-fail)'}
              sub={metrics.passRate == null ? 'Run a suite to see your pass rate' : 'passed / (passed + failed)'}
            />
            <MetricCard
              label="Open Bugs"
              value={metrics.openBugs}
              accent={metrics.openBugs > 0 ? 'var(--status-fail)' : 'var(--status-pass)'}
              sub={metrics.openBugs > 0 ? 'awaiting resolution' : 'All clear — none open'}
            />
            <MetricCard
              label="Avg Run Duration"
              value={formatDuration(metrics.avgRunDurationSeconds)}
              accent={metrics.avgRunDurationSeconds == null ? '#d1d5db' : undefined}
              sub={metrics.avgRunDurationSeconds == null ? 'Complete a run to see timing' : 'across completed runs'}
            />
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* --- Recent test runs --- */}
            <div style={{ flex: 1.4, minWidth: 360, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={panelHead}>Recent Test Runs</div>
              {recentRuns.length === 0 ? (
                <PanelEmpty
                  title="No test runs yet"
                  hint="Open a test suite and start a run — results will show up here."
                />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>
                      <th style={th}>Suite</th>
                      <th style={{ ...th, width: 110 }}>Status</th>
                      <th style={{ ...th, width: 50, textAlign: 'center', color: 'var(--status-pass)' }}>P</th>
                      <th style={{ ...th, width: 50, textAlign: 'center', color: 'var(--status-fail)' }}>F</th>
                      <th style={{ ...th, width: 50, textAlign: 'center', color: 'var(--status-skip)' }}>S</th>
                      <th style={{ ...th, width: 90 }}>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRuns.map((run, i) => (
                      <tr key={run.id} onClick={() => navigate(`/test-runs/${run.id}`)}
                        style={{ background: i % 2 ? 'var(--surface-alt)' : 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 ? 'var(--surface-alt)' : 'var(--surface)'}
                      >
                        <td style={{ ...td, fontWeight: 500 }}>{run.suite_name ?? '—'}</td>
                        <td style={td}><RunStatusBadge status={run.status} /></td>
                        <td style={{ ...td, textAlign: 'center' }}>{run.pass_count ? <span style={{ color: 'var(--status-pass)', fontWeight: 600 }}>{run.pass_count}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{run.fail_count ? <span style={{ color: 'var(--status-fail)', fontWeight: 600 }}>{run.fail_count}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                        <td style={{ ...td, textAlign: 'center' }}>{run.skip_count ? <span style={{ color: 'var(--status-skip)', fontWeight: 600 }}>{run.skip_count}</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                        <td style={{ ...td, color: 'var(--text-faint)', fontSize: 13 }}>{relativeTime(run.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* --- Recent activity feed --- */}
            <div style={{ flex: 1, minWidth: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={panelHead}>Recent Activity</div>
              {recentActivity.length === 0 ? (
                <PanelEmpty
                  title="No activity yet"
                  hint="Activity appears when bugs are created, updated, or commented on."
                />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {recentActivity.map((a, i) => (
                    <li key={a.id}
                      onClick={() => a.bug_id && navigate(`/bugs/${a.bug_id}`)}
                      style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: i === recentActivity.length - 1 ? 'none' : '1px solid var(--border-subtle)', cursor: a.bug_id ? 'pointer' : 'default' }}
                      onMouseEnter={e => { if (a.bug_id) e.currentTarget.style.background = 'var(--surface-alt)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', marginTop: 6, background: ACTION_DOT[a.action] ?? '#9ca3af' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{a.summary}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{relativeTime(a.created_at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* --- Insights: trend, bug flow & coverage --- */}
          <div style={{ marginTop: 28 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: 'var(--canvas-heading)' }}>Insights</h2>
            {!trends ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ChartSkeleton />
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <ChartSkeleton wide />
                  <ChartSkeleton />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <PassRateTrendChart data={trends.passRateTrend} />
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
                  <BugsWeeklyChart data={trends.bugsWeekly} />
                  <CoverageDonutChart data={trends.coverageByStatus} />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const keyframes = `@keyframes dash-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`;
const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' };
const td = { padding: '12px 16px', verticalAlign: 'middle' };
const panelHead = { padding: '14px 16px', fontSize: 15, fontWeight: 700, borderBottom: '1px solid var(--border)' };
