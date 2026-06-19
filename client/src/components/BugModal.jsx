import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const BLANK = { title: '', description: '', severity: '', priority: 'Medium', steps: '', expected: '', actual: '', environment: '' };
const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export default function BugModal({ initialData, onClose, onSaved }) {
  const { settings } = useSettings();
  const [form,        setForm]        = useState(BLANK);
  const [errors,      setErrors]      = useState({});
  const [serverError, setServerError] = useState('');
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        title:       initialData.title       ?? '',
        description: initialData.description ?? '',
        severity:    initialData.severity    ?? '',
        priority:    initialData.priority    ?? 'Medium',
        steps:       Array.isArray(initialData.steps) ? initialData.steps.join('\n') : '',
        expected:    initialData.expected    ?? '',
        actual:      initialData.actual      ?? '',
        environment: initialData.environment ?? '',
      });
    } else {
      // New bug: prefill severity from the user's default-severity preference.
      setForm({ ...BLANK, severity: settings.default_severity_for_new_bugs || '' });
    }
    setErrors({});
    setServerError('');
  }, [initialData, settings.default_severity_for_new_bugs]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!form.title.trim())    next.title    = 'Title is required.';
    if (!form.severity)        next.severity = 'Severity is required.';
    if (Object.keys(next).length) { setErrors(next); return; }

    const stepsArr = form.steps.split('\n').map(s => s.trim()).filter(Boolean);
    const payload  = {
      title:       form.title.trim(),
      description: form.description.trim(),
      severity:    form.severity,
      priority:    form.priority,
      steps:       stepsArr,
      expected:    form.expected.trim(),
      actual:      form.actual.trim(),
      environment: form.environment.trim(),
    };

    setSaving(true);
    setServerError('');
    try {
      const res  = await fetch(initialData ? `/api/bugs/${initialData.id}` : '/api/bugs', {
        method:  initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) { setServerError(json.error || 'Save failed.'); return; }
      onSaved(json.data);
    } catch {
      setServerError('Could not reach the server. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, padding: '24px 16px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="bug-modal-title" style={{ background: 'var(--surface)', borderRadius: 10, width: '100%', maxWidth: 580, padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 id="bug-modal-title" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{initialData ? 'Edit Bug' : 'New Bug'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', padding: 4 }} aria-label="Close"><X size={20} /></button>
        </div>

        {serverError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Title *" error={errors.title} htmlFor="bug-title">
            <input id="bug-title" value={form.title} onChange={set('title')} style={inp(errors.title)} placeholder="Short description of the defect" maxLength={255} />
          </Field>

          <Field label="Description" htmlFor="bug-description">
            <textarea id="bug-description" value={form.description} onChange={set('description')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What is the context? Any additional detail?" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Severity *" error={errors.severity} htmlFor="bug-severity">
              <select id="bug-severity" value={form.severity} onChange={set('severity')} style={inp(errors.severity)}>
                <option value="">Select severity…</option>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority" htmlFor="bug-priority">
              <select id="bug-priority" value={form.priority} onChange={set('priority')} style={inp()}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Steps to Reproduce" hint="One step per line" htmlFor="bug-steps">
            <textarea id="bug-steps" value={form.steps} onChange={set('steps')} style={{ ...inp(), height: 96, resize: 'vertical', fontFamily: 'inherit' }} placeholder={'1. Go to /login\n2. Leave password blank\n3. Click Submit'} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Expected Result" htmlFor="bug-expected">
              <textarea id="bug-expected" value={form.expected} onChange={set('expected')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What should have happened?" />
            </Field>
            <Field label="Actual Result" htmlFor="bug-actual">
              <textarea id="bug-actual" value={form.actual} onChange={set('actual')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What actually happened?" />
            </Field>
          </div>

          <Field label="Environment" htmlFor="bug-environment">
            <input id="bug-environment" value={form.environment} onChange={set('environment')} style={inp()} placeholder="e.g. Chrome 125 / macOS 15 / v1.0.0" maxLength={255} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : initialData ? 'Save Changes' : 'Create Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error, hint, htmlFor }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
        {label}{hint && <span style={{ fontWeight: 400, color: 'var(--text-faint)', marginLeft: 6 }}>— {hint}</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function inp(error) {
  return { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
}
