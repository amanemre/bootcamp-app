import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, ExternalLink, FileText } from 'lucide-react';

const SEV_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#4b5563' },
};

const RESULT_STYLES = {
  pending:  { background: '#f3f4f6', color: '#4b5563'  },
  passed:   { background: '#dcfce7', color: '#16a34a'  },
  failed:   { background: '#fee2e2', color: '#dc2626'  },
  skipped:  { background: '#f3e8ff', color: '#7e22ce'  },
};

const STATUS_STYLES = {
  in_progress: { background: '#fef9c3', color: '#854d0e', label: 'In Progress' },
  completed:   { background: '#dcfce7', color: '#16a34a', label: 'Completed'   },
};

function Badge({ value, map }) {
  const s = map[value] ?? { background: '#f3f4f6', color: '#4b5563' };
  const label = s.label ?? value;
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{label}</span>;
}

import { formatDateTimeShort as formatDateTime } from '../utils/datetime';

function ProgressBar({ pass, fail, skip, total }) {
  if (!total) return null;
  const pct = n => `${Math.round((n / total) * 100)}%`;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, background: 'var(--border)' }}>
        <div style={{ width: pct(pass), background: '#16a34a', transition: 'width 0.3s' }} />
        <div style={{ width: pct(fail), background: '#dc2626', transition: 'width 0.3s' }} />
        <div style={{ width: pct(skip), background: '#7e22ce', transition: 'width 0.3s' }} />
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 13 }}>
        <span style={{ color: 'var(--status-pass)', fontWeight: 600 }}>{pass} passed</span>
        <span style={{ color: 'var(--status-fail)', fontWeight: 600 }}>{fail} failed</span>
        <span style={{ color: 'var(--status-skip)', fontWeight: 600 }}>{skip} skipped</span>
        <span style={{ color: 'var(--text-faint)' }}>{total - pass - fail - skip} pending</span>
      </div>
    </div>
  );
}

function ResultRow({ r, onUpdate, saving }) {
  const [notes, setNotes] = useState(r.notes || '');

  function mark(result) {
    onUpdate(r.id, result, notes);
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 10, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{r.case_title ?? '(deleted case)'}</span>
            {r.severity && <Badge value={r.severity} map={SEV_STYLES} />}
            <Badge value={r.result} map={RESULT_STYLES} />
          </div>
          {r.expected_result && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              <strong>Expected:</strong> {r.expected_result}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => mark('passed')} disabled={saving}
            title="Pass"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #bbf7d0', background: r.result === 'passed' ? '#dcfce7' : 'var(--surface)', color: '#16a34a', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            <CheckCircle size={14} /> Pass
          </button>
          <button onClick={() => mark('failed')} disabled={saving}
            title="Fail"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: r.result === 'failed' ? '#fee2e2' : 'var(--surface)', color: '#dc2626', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            <XCircle size={14} /> Fail
          </button>
          <button onClick={() => mark('skipped')} disabled={saving}
            title="Skip"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, border: '1px solid #e9d5ff', background: r.result === 'skipped' ? '#f3e8ff' : 'var(--surface)', color: '#7e22ce', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            <MinusCircle size={14} /> Skip
          </button>
        </div>
      </div>

      <input
        aria-label="Notes for this test case"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => { if (notes !== (r.notes || '')) onUpdate(r.id, r.result === 'pending' ? null : r.result, notes); }}
        placeholder="Notes (optional)…"
        style={{ width: '100%', padding: '6px 10px', borderRadius: 5, border: '1px solid var(--border)', fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', color: 'var(--text-secondary)' }}
      />

      {r.github_issue_url && (
        <a href={r.github_issue_url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: 'var(--link)', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          <ExternalLink size={12} /> GitHub Issue
        </a>
      )}
    </div>
  );
}

export default function TestRunDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [run,        setRun]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [newReportId, setNewReportId] = useState(null);

  const fetchRun = useCallback(async () => {
    setFetchError('');
    try {
      const res  = await fetch(`/api/runs/${id}`);
      const json = await res.json();
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!json.success) { setFetchError(json.error || 'Failed to load run.'); setLoading(false); return; }
      setRun(json.data);
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  async function handleUpdateResult(resultId, result, notes) {
    if (result === null) return;
    setSaving(true);
    setActionError('');
    try {
      const res  = await fetch(`/api/runs/${id}/results/${resultId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, notes }),
      });
      const json = await res.json();
      if (json.success) setRun(json.data);
      else setActionError(json.error || 'Failed to save result.');
    } catch {
      setActionError('Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateReport() {
    setGenerating(true);
    setGenerateError('');
    setNewReportId(null);
    try {
      const res  = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: Number(id) }),
      });
      const json = await res.json();
      if (json.success) {
        setNewReportId(json.data.id);
        navigate(`/reports/${json.data.id}`);
      } else {
        setGenerateError(json.error || 'Failed to generate report.');
      }
    } catch {
      setGenerateError('Could not reach the server.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading)    return <main style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</main>;
  if (notFound)   return <main style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-faint)' }}>Run not found.</main>;
  if (fetchError) return (
    <main style={{ padding: '32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 18px', borderRadius: 6, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fetchError}</span>
        <button onClick={fetchRun} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
      </div>
    </main>
  );

  const total = run.results?.length ?? 0;

  return (
    <main style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>
      <button onClick={() => navigate('/test-runs')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--canvas-muted)', fontSize: 14, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Back to Test Runs
      </button>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{run.suite_name}</h1>
            <Badge value={run.status} map={STATUS_STYLES} />
            {saving && <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>Saving…</span>}
          </div>
          <button onClick={handleGenerateReport} disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0, opacity: generating ? 0.6 : 1 }}>
            <FileText size={15} /> {generating ? 'Generating…' : 'Generate report'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--canvas-muted)', flexWrap: 'wrap' }}>
          {run.feature && <span>Feature: <strong style={{ color: 'var(--canvas-strong)' }}>{run.feature}</strong></span>}
          <span>Started: {formatDateTime(run.start_time)}</span>
          {run.end_time && <span>Ended: {formatDateTime(run.end_time)}</span>}
          {run.created_by && <span>By: <strong style={{ color: 'var(--canvas-strong)' }}>{run.created_by}</strong></span>}
        </div>
      </div>

      {generateError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{generateError}</span>
          <button aria-label="Dismiss error" onClick={() => setGenerateError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {newReportId && (
        <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Report #{newReportId} generated.</span>
          <button onClick={() => navigate(`/reports/${newReportId}`)} style={{ background: 'none', border: '1px solid #15803d', borderRadius: 4, color: '#15803d', cursor: 'pointer', padding: '3px 10px', fontSize: 13, fontWeight: 600 }}>View report</button>
        </div>
      )}

      <ProgressBar pass={run.pass_count} fail={run.fail_count} skip={run.skip_count} total={total} />

      {actionError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button aria-label="Dismiss error" onClick={() => setActionError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {(run.results ?? []).map(r => (
        <ResultRow key={r.id} r={r} onUpdate={handleUpdateResult} saving={saving} />
      ))}
    </main>
  );
}
