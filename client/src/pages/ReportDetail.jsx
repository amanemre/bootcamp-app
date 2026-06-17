import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, ExternalLink } from 'lucide-react';

const SEV_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#6b7280' },
};

const RESULT_STYLES = {
  pending: { background: '#f3f4f6', color: '#6b7280' },
  passed:  { background: '#dcfce7', color: '#16a34a' },
  failed:  { background: '#fee2e2', color: '#dc2626' },
  skipped: { background: '#f3e8ff', color: '#7e22ce' },
};

function Badge({ value, map }) {
  if (!value) return <span style={{ color: '#d1d5db' }}>—</span>;
  const s = map[value] ?? { background: '#f3f4f6', color: '#374151' };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{value}</span>;
}

function formatDateTime(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 110, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ?? '#111827', marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function ReportDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [report,      setReport]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [fetchError,  setFetchError]  = useState('');
  const [actionError, setActionError] = useState('');
  const [printing,    setPrinting]    = useState(false);

  const fetchReport = useCallback(async () => {
    setFetchError('');
    try {
      const res  = await fetch(`/api/reports/${id}`);
      const json = await res.json();
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!json.success) { setFetchError(json.error || 'Failed to load report.'); setLoading(false); return; }
      setReport(json.data);
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // The export endpoint sets Content-Disposition: attachment, so a plain
  // navigation downloads the file without leaving the page.
  function handleDownload() {
    const a = document.createElement('a');
    a.href = `/api/reports/${id}/export/html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Reuse the same self-contained export HTML for printing: fetch it, write
  // it into a new window, and trigger the browser print dialog (Save as PDF).
  async function handlePrint() {
    setPrinting(true);
    setActionError('');
    try {
      const res = await fetch(`/api/reports/${id}/export/html`);
      if (!res.ok) throw new Error('export failed');
      const html = await res.text();
      const w = window.open('', '_blank');
      if (!w) { setActionError('Pop-up blocked. Allow pop-ups for this site to print.'); return; }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    } catch {
      setActionError('Could not open the print view. Try Download HTML instead.');
    } finally {
      setPrinting(false);
    }
  }

  if (loading)    return <div style={{ padding: '48px 32px', textAlign: 'center', color: '#9ca3af' }}>Loading…</div>;
  if (notFound)   return <div style={{ padding: '48px 32px', textAlign: 'center', color: '#9ca3af' }}>Report not found.</div>;
  if (fetchError) return (
    <div style={{ padding: '32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 18px', borderRadius: 6, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fetchError}</span>
        <button onClick={fetchReport} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  const results = report.results ?? [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => navigate('/reports')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Back to Reports
      </button>

      {/* Header + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          Report #{report.id} — {report.suite_name || 'Untitled Suite'}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={handleDownload}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Download size={15} /> Download HTML
          </button>
          <button onClick={handlePrint} disabled={printing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: printing ? 0.6 : 1 }}>
            <Printer size={15} /> {printing ? 'Preparing…' : 'Print / Save as PDF'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280', flexWrap: 'wrap', marginBottom: 20 }}>
        <span>Run date: <strong style={{ color: '#374151' }}>{formatDateTime(report.run_date)}</strong></span>
        <span>Generated: <strong style={{ color: '#374151' }}>{formatDateTime(report.generated_at)}</strong></span>
        {report.run_id != null && <span>From run: <strong style={{ color: '#374151' }}>#{report.run_id}</strong></span>}
      </div>

      {actionError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <SummaryCard label="Total"    value={report.total_count} />
        <SummaryCard label="Passed"   value={report.passed_count}  accent="#16a34a" />
        <SummaryCard label="Failed"   value={report.failed_count}  accent="#dc2626" />
        <SummaryCard label="Skipped"  value={report.skipped_count} accent="#7e22ce" />
        <SummaryCard label="Pass Rate" value={report.total_count > 0 ? `${Math.round((report.passed_count / report.total_count) * 100)}%` : '—'} />
      </div>

      {/* Per-case results */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ ...th, width: 40 }}>#</th>
              <th style={th}>Test Case</th>
              <th style={{ ...th, width: 100 }}>Severity</th>
              <th style={{ ...th, width: 90 }}>Result</th>
              <th style={{ ...th, width: 90 }}>Duration</th>
              <th style={{ ...th, width: 200 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>This report has no test cases.</td></tr>
            )}
            {results.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? '#fafafa' : '#fff', borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ ...td, color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 500 }}>{r.case_title}</td>
                <td style={td}><Badge value={r.severity} map={SEV_STYLES} /></td>
                <td style={td}><Badge value={r.result} map={RESULT_STYLES} /></td>
                <td style={{ ...td, color: '#6b7280' }}>{r.duration_ms != null ? `${r.duration_ms} ms` : '—'}</td>
                <td style={{ ...td, color: '#6b7280', fontSize: 13 }}>
                  {r.notes || '—'}
                  {r.github_issue_url && (
                    <a href={r.github_issue_url} target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
                      <ExternalLink size={12} /> Issue
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13, color: '#374151' };
const td = { padding: '12px 16px', verticalAlign: 'top' };
