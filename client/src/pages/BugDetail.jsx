import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, MessageSquare, RefreshCw } from 'lucide-react';
import BugModal from '../components/BugModal';

const SEV_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  Major:    { background: '#ffedd5', color: '#ea580c' },
  Minor:    { background: '#fef9c3', color: '#854d0e' },
  Trivial:  { background: '#f3f4f6', color: '#4b5563' },
};

const PRI_STYLES = {
  Critical: { background: '#fee2e2', color: '#dc2626' },
  High:     { background: '#ffedd5', color: '#ea580c' },
  Medium:   { background: '#dbeafe', color: '#1d4ed8' },
  Low:      { background: '#f3f4f6', color: '#4b5563' },
};

const STATUS_STYLES = {
  'Open':        { background: '#dbeafe', color: '#1d4ed8' },
  'In Progress': { background: '#fef9c3', color: '#854d0e' },
  'Resolved':    { background: '#dcfce7', color: '#16a34a' },
  'Closed':      { background: '#f3f4f6', color: '#4b5563' },
  'Reopened':    { background: '#f3e8ff', color: '#7e22ce' },
};

const TRANSITIONS = {
  'Open':        ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'Closed'],
  'Resolved':    ['Closed', 'Reopened'],
  'Closed':      ['Reopened'],
  'Reopened':    ['In Progress', 'Closed'],
};

function Badge({ value, map }) {
  const s = map[value] ?? { background: '#f3f4f6', color: '#4b5563' };
  return <span style={{ padding: '3px 11px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: s.background, color: s.color, whiteSpace: 'nowrap' }}>{value}</span>;
}

import { formatDateTime } from '../utils/datetime';

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
      <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function BugDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [bug,         setBug]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [fetchError,  setFetchError]  = useState('');
  const [actionError, setActionError] = useState('');
  const [editOpen,    setEditOpen]    = useState(false);
  const [nextStatus,  setNextStatus]  = useState('');
  const [applying,    setApplying]    = useState(false);
  const [comment,     setComment]     = useState('');
  const [commenting,  setCommenting]  = useState(false);

  const fetchBug = useCallback(async () => {
    setFetchError('');
    try {
      const res  = await fetch(`/api/bugs/${id}`);
      const json = await res.json();
      if (res.status === 404) { setNotFound(true); setLoading(false); return; }
      if (!json.success)      { setFetchError(json.error || 'Failed to load bug.'); setLoading(false); return; }
      setBug(json.data);
      setNextStatus('');
    } catch {
      setFetchError('Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBug(); }, [fetchBug]);

  async function applyStatus() {
    if (!nextStatus) return;
    setApplying(true);
    setActionError('');
    try {
      const res  = await fetch(`/api/bugs/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!json.success) { setActionError(json.error || 'Status change failed.'); return; }
      setBug(json.data);
      setNextStatus('');
    } catch {
      setActionError('Could not reach the server.');
    } finally {
      setApplying(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    setActionError('');
    try {
      const res  = await fetch(`/api/bugs/${id}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: comment.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setActionError(json.error || 'Comment failed.'); return; }
      setBug(b => ({ ...b, activity: json.data }));
      setComment('');
    } catch {
      setActionError('Could not reach the server.');
    } finally {
      setCommenting(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this bug? This cannot be undone.')) return;
    try {
      const res  = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) navigate('/bugs');
      else setActionError(json.error || 'Delete failed.');
    } catch {
      setActionError('Could not reach the server. The bug was not deleted.');
    }
  }

  if (loading)    return <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-faint)' }}>Loading…</div>;
  if (notFound)   return <div style={{ padding: '48px 32px', textAlign: 'center', color: 'var(--text-faint)' }}>Bug not found.</div>;
  if (fetchError) return (
    <div style={{ padding: '32px', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px 18px', borderRadius: 6, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{fetchError}</span>
        <button onClick={fetchBug} style={{ background: 'none', border: '1px solid #dc2626', borderRadius: 4, color: '#dc2626', cursor: 'pointer', padding: '3px 10px', fontSize: 13 }}>Retry</button>
      </div>
    </div>
  );

  const allowed = TRANSITIONS[bug.status] ?? [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 860, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate('/bugs')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--canvas-muted)', fontSize: 14, padding: 0, marginBottom: 20 }}>
        <ArrowLeft size={15} /> Back to Bugs
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>{bug.title}</h1>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setEditOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>
            <Pencil size={13} /> Edit
          </button>
          <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 6, border: '1px solid #fca5a5', background: 'var(--surface)', color: '#dc2626', cursor: 'pointer', fontSize: 14 }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Meta badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
        <Badge value={bug.status}   map={STATUS_STYLES} />
        <Badge value={bug.severity} map={SEV_STYLES} />
        <Badge value={bug.priority} map={PRI_STYLES} />
        <span style={{ fontSize: 13, color: 'var(--text-faint)', marginLeft: 4 }}>Created {formatDateTime(bug.created_at)}</span>
        {bug.updated_at !== bug.created_at && <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>· Updated {formatDateTime(bug.updated_at)}</span>}
      </div>

      {actionError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 20, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {/* Details */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        {bug.description && <Section title="Description">{bug.description}</Section>}

        {bug.steps?.length > 0 && (
          <Section title="Steps to Reproduce">
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {bug.steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
            </ol>
          </Section>
        )}

        {(bug.expected || bug.actual) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {bug.expected && (
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Result</h3>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{bug.expected}</div>
              </div>
            )}
            {bug.actual && (
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actual Result</h3>
                <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{bug.actual}</div>
              </div>
            )}
          </div>
        )}

        {bug.environment && <Section title="Environment">{bug.environment}</Section>}
      </div>

      {/* Status change */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Change Status</h3>
        {allowed.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-faint)' }}>No further transitions available from <strong>{bug.status}</strong>.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select value={nextStatus} onChange={e => setNextStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface)' }}>
              <option value="">Select next status…</option>
              {allowed.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={applyStatus} disabled={!nextStatus || applying}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: nextStatus ? '#2563eb' : '#bfdbfe', color: '#fff', fontWeight: 600, fontSize: 14, cursor: nextStatus ? 'pointer' : 'default', opacity: applying ? 0.7 : 1 }}>
              <RefreshCw size={13} /> {applying ? 'Applying…' : 'Apply'}
            </button>
          </div>
        )}
      </div>

      {/* Activity timeline */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600 }}>Activity</h3>

        {bug.activity?.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--text-faint)', margin: '0 0 16px' }}>No activity yet.</p>
        )}

        <div style={{ marginBottom: 16 }}>
          {(bug.activity ?? []).map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.action === 'comment' ? '#f3e8ff' : a.action === 'field_change' ? '#fef9c3' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                {a.action === 'comment'
                  ? <MessageSquare size={13} color="var(--status-skip)" />
                  : a.action === 'field_change'
                  ? <Pencil size={13} color="#854d0e" />
                  : <RefreshCw size={13} color="#1d4ed8" />}
              </div>
              <div style={{ flex: 1 }}>
                {a.action === 'status_change' ? (
                  <p style={{ margin: '0 0 2px', fontSize: 14, color: 'var(--text-secondary)' }}>
                    Status changed from <strong>{a.old_value}</strong> to <strong>{a.new_value}</strong>
                  </p>
                ) : a.action === 'field_change' ? (
                  <p style={{ margin: '0 0 2px', fontSize: 14, color: 'var(--text-secondary)' }}>
                    <strong>{a.message}</strong> updated
                    {a.old_value && <span style={{ color: 'var(--text-faint)' }}> from "{a.old_value.length > 60 ? a.old_value.slice(0, 60) + '…' : a.old_value}"</span>}
                  </p>
                ) : (
                  <p style={{ margin: '0 0 2px', fontSize: 14, color: 'var(--text-secondary)' }}>{a.message}</p>
                )}
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-faint)' }}>{formatDateTime(a.created_at)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add comment */}
        <form onSubmit={submitComment}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Add Comment</h4>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Write a comment…"
            maxLength={2000}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, height: 72, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8 }}
          />
          <button type="submit" disabled={!comment.trim() || commenting}
            style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: comment.trim() ? '#2563eb' : '#bfdbfe', color: '#fff', fontWeight: 600, fontSize: 14, cursor: comment.trim() ? 'pointer' : 'default', opacity: commenting ? 0.7 : 1 }}>
            {commenting ? 'Posting…' : 'Post Comment'}
          </button>
        </form>
      </div>

      {editOpen && (
        <BugModal
          initialData={bug}
          onClose={() => setEditOpen(false)}
          onSaved={updated => { setBug(b => ({ ...b, ...updated })); setEditOpen(false); }}
        />
      )}
    </div>
  );
}
