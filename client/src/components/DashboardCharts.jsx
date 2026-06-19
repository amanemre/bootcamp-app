// Dashboard charts built with Recharts — gradient area line, grouped bars,
// and a donut. Styling aims for a modern SaaS look (Linear / Datadog).
import {
  ResponsiveContainer, AreaChart, Area, LineChart,
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

const C = {
  blue:   '#2563eb',
  green:  '#16a34a',
  red:    '#dc2626',
  amber:  '#d97706',
  gray:   '#94a3b8',
  grid:   '#eef2f6',
  axis:   '#94a3b8',
  text:   'var(--text)',
};

const STATUS_COLOR = {
  Passed:  C.green,
  Failed:  C.red,
  Skipped: C.amber,
  Ready:   C.blue,
  Draft:   C.gray,
};

/* ----------------------------------- Shared shell ----------------------------------- */
function ChartCard({ title, subtitle, children, style }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '20px 22px', boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04)',
      display: 'flex', flexDirection: 'column', ...style,
    }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#94a3b8' }}>{subtitle}</p>}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function ChartEmpty({ children }) {
  return (
    <div style={{
      height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', color: '#94a3b8', fontSize: 13.5,
      border: '1px dashed var(--border)', borderRadius: 10, padding: '0 24px', lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

const tooltipStyle = {
  border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
  fontSize: 12.5, padding: '8px 12px',
};
function TipShell({ label, rows }) {
  return (
    <div style={{ background: 'var(--surface)', ...tooltipStyle }}>
      {label && <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>{label}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)' }}>
          {r.color && <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color }} />}
          <span>{r.label}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: C.text }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

const axisProps = { tickLine: false, axisLine: false, tick: { fontSize: 12, fill: C.axis } };

/* ------------------------------ 1. Pass-rate trend ------------------------------ */
function shortDate(str) {
  if (!str) return '';
  const d = new Date(str.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? '' : `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function PassRateTrendChart({ data = [] }) {
  const rows = data.map(d => ({ ...d, label: shortDate(d.date) }));
  return (
    <ChartCard title="Pass-Rate Trend" subtitle="Last 10 test runs" style={{ minHeight: 320 }}>
      {rows.length === 0 ? (
        <ChartEmpty>No test runs yet — run a suite and the pass-rate trend will appear here.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="passGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.blue} stopOpacity={0.28} />
                <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
            <XAxis dataKey="label" {...axisProps} padding={{ left: 12, right: 12 }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} width={44} {...axisProps} />
            <Tooltip
              cursor={{ stroke: C.blue, strokeOpacity: 0.25, strokeWidth: 1 }}
              content={({ active, payload }) => active && payload?.length
                ? <TipShell label={`Run #${payload[0].payload.run_id}`} rows={[{ color: C.blue, label: 'Pass rate', value: `${payload[0].value}%` }]} />
                : null}
            />
            <Area
              type="monotone" dataKey="pass_rate" stroke={C.blue} strokeWidth={2.5}
              fill="url(#passGrad)"
              dot={{ r: 3.5, fill: '#fff', stroke: C.blue, strokeWidth: 2 }}
              activeDot={{ r: 5.5, fill: '#fff', stroke: C.blue, strokeWidth: 2.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* --------------------------- 2. Bugs opened vs closed --------------------------- */
export function BugsWeeklyChart({ data = [] }) {
  const hasData = data.some(d => d.opened || d.closed);
  return (
    <ChartCard title="Bugs Opened vs Closed" subtitle="Last 8 weeks" style={{ flex: 1.3, minWidth: 360, minHeight: 320 }}>
      {!hasData ? (
        <ChartEmpty>No bugs were opened or closed in the last 8 weeks.</ChartEmpty>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }} barGap={4} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
            <XAxis dataKey="week" {...axisProps} />
            <YAxis allowDecimals={false} width={36} {...axisProps} />
            <Tooltip
              cursor={{ fill: 'rgba(15,23,42,0.04)' }}
              content={({ active, payload, label }) => active && payload?.length
                ? <TipShell label={`Week of ${label}`} rows={payload.map(p => ({ color: p.color, label: p.name, value: p.value }))} />
                : null}
            />
            <Legend
              iconType="circle" iconSize={9}
              wrapperStyle={{ fontSize: 12.5, paddingTop: 8 }}
              formatter={v => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
            />
            <Bar name="Opened" dataKey="opened" fill={C.blue}  radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Bar name="Closed" dataKey="closed" fill={C.green} radius={[4, 4, 0, 0]} maxBarSize={26} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/* ---------------------------- 3. Coverage donut ---------------------------- */
export function CoverageDonutChart({ data = [] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const slices = data.filter(d => d.count > 0);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.08) return null;                 // hide labels on tiny slices
    const RAD = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RAD);
    const y = cy + r * Math.sin(-midAngle * RAD);
    return (
      <text x={x} y={y} fill="#fff" fontSize={12} fontWeight={700} textAnchor="middle" dominantBaseline="central">
        {Math.round(percent * 100)}%
      </text>
    );
  };

  return (
    <ChartCard title="Test Coverage by Status" subtitle="All test cases" style={{ flex: 1, minWidth: 300, minHeight: 320 }}>
      {total === 0 ? (
        <ChartEmpty>No test cases yet — add some to see coverage by status.</ChartEmpty>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 200, height: 220, flex: '0 0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices} dataKey="count" nameKey="status"
                  cx="50%" cy="50%" innerRadius={62} outerRadius={92}
                  paddingAngle={slices.length > 1 ? 2 : 0} cornerRadius={6}
                  startAngle={90} endAngle={-270}
                  labelLine={false} label={renderLabel} stroke="none"
                >
                  {slices.map(s => <Cell key={s.status} fill={STATUS_COLOR[s.status] ?? C.gray} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => active && payload?.length
                    ? <TipShell rows={[{ color: STATUS_COLOR[payload[0].name] ?? C.gray, label: payload[0].name, value: `${payload[0].value} · ${Math.round((payload[0].value / total) * 100)}%` }]} />
                    : null}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1 }}>{total}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>test cases</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 130 }}>
            {data.map(d => (
              <div key={d.status} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, padding: '5px 0' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLOR[d.status], opacity: d.count ? 1 : 0.3, flexShrink: 0 }} />
                <span style={{ color: d.count ? 'var(--text-secondary)' : '#94a3b8' }}>{d.status}</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, color: d.count ? C.text : '#cbd5e1' }}>
                  {d.count}{d.count ? ` · ${Math.round((d.count / total) * 100)}%` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------ Loading skeleton ------------------------------ */
export function ChartSkeleton({ wide }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px',
      flex: wide ? 1.3 : 1, minWidth: wide ? 360 : 300, minHeight: 320,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
    }}>
      <div style={{ ...skelBlock, width: 150, height: 14 }} />
      <div style={{ ...skelBlock, width: 90, height: 11, marginTop: 8 }} />
      <div style={{ ...skelBlock, height: 210, marginTop: 18, borderRadius: 10 }} />
    </div>
  );
}
const skelBlock = {
  borderRadius: 6,
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e8edf3 37%, #f1f5f9 63%)',
  backgroundSize: '400% 100%',
  animation: 'dash-shimmer 1.4s ease infinite',
};
