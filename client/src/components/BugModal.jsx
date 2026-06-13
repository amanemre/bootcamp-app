import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BLANK = { title: '', description: '', severity: '', priority: 'Medium', steps: '', expected: '', actual: '', environment: '' };
const SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

export default function BugModal({ initialData, onClose, onSaved }) {
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
      setForm(BLANK);
    }
    setErrors({});
    setServerError('');
  }, [initialData]);

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
      <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 580, padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{initialData ? 'Edit Bug' : 'New Bug'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }} aria-label="Close"><X size={20} /></button>
        </div>

        {serverError && (
          <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{serverError}</div>
        )}

        <form onSubmit={handleSubmit}>
          <Field label="Title *" error={errors.title}>
            <input value={form.title} onChange={set('title')} style={inp(errors.title)} placeholder="Short description of the defect" maxLength={255} />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={set('description')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What is the context? Any additional detail?" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Severity *" error={errors.severity}>
              <select value={form.severity} onChange={set('severity')} style={inp(errors.severity)}>
                <option value="">Select severity…</option>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={set('priority')} style={inp()}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Steps to Reproduce" hint="One step per line">
            <textarea value={form.steps} onChange={set('steps')} style={{ ...inp(), height: 96, resize: 'vertical', fontFamily: 'inherit' }} placeholder={'1. Go to /login\n2. Leave password blank\n3. Click Submit'} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Expected Result">
              <textarea value={form.expected} onChange={set('expected')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What should have happened?" />
            </Field>
            <Field label="Actual Result">
              <textarea value={form.actual} onChange={set('actual')} style={{ ...inp(), height: 72, resize: 'vertical' }} placeholder="What actually happened?" />
            </Field>
          </div>

          <Field label="Environment">
            <input value={form.environment} onChange={set('environment')} style={inp()} placeholder="e.g. Chrome 125 / macOS 15 / v1.0.0" maxLength={255} />
          </Field>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : initialData ? 'Save Changes' : 'Create Bug'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, error, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label}{hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>— {hint}</span>}
      </label>
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}

function inp(error) {
  return { width: '100%', padding: '8px 10px', borderRadius: 6, border: `1px solid ${error ? '#dc2626' : '#d1d5db'}`, fontSize: 14, boxSizing: 'border-box', fontFamily: 'inherit' };
}
